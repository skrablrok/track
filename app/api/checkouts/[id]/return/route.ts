import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const { notes } = body

    const checkout = await db.checkout.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
      include: { tool: true, user: true },
    })

    if (!checkout) return new Response(JSON.stringify({ error: 'Checkout not found' }), { status: 404 })
    if (checkout.status === 'RETURNED') return new Response(JSON.stringify({ error: 'Already returned' }), { status: 400 })
    if (checkout.status === 'PENDING_RETURN') return new Response(JSON.stringify({ error: 'Return already requested' }), { status: 400 })

    const isOwnerOrAdmin =
      checkout.userId === user.id || ['ADMIN', 'MANAGER'].includes(user.role as string)
    if (!isOwnerOrAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

    const updated = await db.checkout.update({
      where: { id: params.id },
      data: {
        status: 'PENDING_RETURN',
        ...(notes && { notes }),
      },
      include: {
        tool: true,
        user: { select: { id: true, name: true, email: true } },
        project: true,
      },
    })

    await logAudit(
      user.id,
      'RETURN_REQUESTED',
      'Checkout',
      checkout.id,
      `${user.name} requested return of ${checkout.quantity}x ${checkout.tool.name}`,
      user.organizationId
    )

    await notifyAdmins(
      user.organizationId,
      'RETURN_REQUESTED',
      'Tool Return Requested',
      `${user.name} requested to return ${checkout.tool.name}. Please confirm the return.`,
      `/checkouts`
    )

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
