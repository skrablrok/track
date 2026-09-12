import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const qty = parseInt(body.quantity)

    const checkout = await db.checkout.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
      include: { tool: true, user: true },
    })

    if (!checkout) return new Response(JSON.stringify({ error: 'Checkout not found' }), { status: 404 })
    if (checkout.tool.type !== 'MATERIAL') return badRequest('Only materials can be returned this way')
    if (checkout.status !== 'CONSUMED') return badRequest('Checkout is not consumed')

    const isOwnerOrAdmin =
      checkout.userId === user.id || ['ADMIN', 'MANAGER'].includes(user.role as string)
    if (!isOwnerOrAdmin) return forbidden()

    const remaining = checkout.quantity - checkout.returnedQty
    if (!qty || qty <= 0 || qty > remaining) {
      return badRequest(`Quantity must be between 1 and ${remaining}`)
    }

    const [updated] = await db.$transaction([
      db.checkout.update({
        where: { id: params.id },
        data: { returnedQty: { increment: qty } },
        include: {
          tool: true,
          user: { select: { id: true, name: true, email: true } },
          project: true,
        },
      }),
      db.tool.update({
        where: { id: checkout.toolId },
        data: { currentStock: { increment: qty } },
      }),
    ])

    await logAudit(
      user.id,
      'MATERIAL_RETURNED',
      'Checkout',
      checkout.id,
      `${user.name} returned ${qty}x unused ${checkout.tool.name}`,
      user.organizationId
    )

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
