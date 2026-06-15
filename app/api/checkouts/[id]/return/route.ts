import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError, calcDurationMins } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { notes } = body

    const checkout = await db.checkout.findUnique({
      where: { id: params.id },
      include: { tool: true, user: true },
    })

    if (!checkout) return new Response(JSON.stringify({ error: 'Checkout not found' }), { status: 404 })
    if (checkout.status === 'RETURNED') return new Response(JSON.stringify({ error: 'Already returned' }), { status: 400 })

    const isOwnerOrAdmin =
      checkout.userId === user.id || ['ADMIN', 'MANAGER'].includes(user.role as string)
    if (!isOwnerOrAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

    const returnDate = new Date()
    const durationMins = calcDurationMins(checkout.checkoutDate, returnDate)

    const [updated] = await db.$transaction([
      db.checkout.update({
        where: { id: params.id },
        data: {
          status: 'RETURNED',
          returnDate,
          durationMins,
          ...(notes && { notes }),
        },
        include: {
          tool: true,
          user: { select: { id: true, name: true, email: true } },
          project: true,
        },
      }),
      db.tool.update({
        where: { id: checkout.toolId },
        data: { currentStock: { increment: checkout.quantity } },
      }),
    ])

    await logAudit(
      user.id,
      'RETURN',
      'Checkout',
      checkout.id,
      `${user.name} returned ${checkout.quantity}x ${checkout.tool.name} after ${durationMins}min`
    )

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
