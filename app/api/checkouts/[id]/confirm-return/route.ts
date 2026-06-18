import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest, calcDurationMins } from '@/lib/utils'
import { notifyUser } from '@/lib/notifications'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const { action } = await req.json()

    if (action !== 'confirm' && action !== 'reject') return badRequest('Invalid action')

    const checkout = await db.checkout.findUnique({
      where: { id: params.id },
      include: { tool: true, user: true },
    })

    if (!checkout) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    if (checkout.status !== 'PENDING_RETURN') return badRequest('Checkout is not pending return')

    if (action === 'confirm') {
      const returnDate = new Date()
      const durationMins = calcDurationMins(checkout.checkoutDate, returnDate)

      await db.$transaction([
        db.checkout.update({
          where: { id: params.id },
          data: { status: 'RETURNED', returnDate, durationMins },
        }),
        db.tool.update({
          where: { id: checkout.toolId },
          data: { currentStock: { increment: checkout.quantity } },
        }),
      ])

      await logAudit(
        user.id,
        'RETURN_CONFIRMED',
        'Checkout',
        checkout.id,
        `${user.name} confirmed return of ${checkout.quantity}x ${checkout.tool.name} from ${checkout.user.name}`
      )

      await notifyUser(
        checkout.userId,
        'RETURN_CONFIRMED',
        'Return Confirmed',
        `Your return of ${checkout.tool.name} has been approved.`,
        `/checkouts`
      )
    } else {
      await db.checkout.update({
        where: { id: params.id },
        data: { status: 'ACTIVE' },
      })

      await logAudit(
        user.id,
        'RETURN_REJECTED',
        'Checkout',
        checkout.id,
        `${user.name} rejected return of ${checkout.tool.name} from ${checkout.user.name}`
      )

      await notifyUser(
        checkout.userId,
        'RETURN_REJECTED',
        'Return Not Confirmed',
        `Your return of ${checkout.tool.name} was not confirmed. Please bring the tool to the warehouse.`,
        `/checkouts`
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError()
  }
}
