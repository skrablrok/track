import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'
import { notifyUser } from '@/lib/notifications'

const STAGES = ['PENDING_PURCHASE', 'ORDERED', 'RECEIVED', 'COMPLETED']

const STAGE_MESSAGE: Record<string, string> = {
  ORDERED: 'has been ordered',
  RECEIVED: 'has arrived and is ready for pickup',
  COMPLETED: 'has been completed',
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole(['ADMIN', 'MANAGER'])
    const { status } = await req.json()

    if (!STAGES.includes(status)) return badRequest('Invalid procurement status')

    const item = await db.requestItem.findUnique({
      where: { id: params.id },
      include: { request: { include: { requester: true } }, tool: { select: { name: true } } },
    })
    if (!item) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    if (item.request.organizationId !== admin.organizationId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
    if (!item.procurementStatus) return badRequest('This item does not need procurement')

    const currentIdx = STAGES.indexOf(item.procurementStatus)
    const nextIdx = STAGES.indexOf(status)
    if (nextIdx !== currentIdx + 1) {
      return badRequest(`Cannot move from ${item.procurementStatus} to ${status} — must advance one stage at a time`)
    }

    const updated = await db.requestItem.update({
      where: { id: params.id },
      data: { procurementStatus: status, procurementUpdatedAt: new Date() },
    })

    const itemLabel = item.tool?.name || item.itemName || 'item'

    await logAudit(
      admin.id, 'PROCUREMENT_STATUS_CHANGE', 'RequestItem', item.id,
      `${admin.name} marked "${itemLabel}" as ${status}`,
      admin.organizationId
    )

    if (STAGE_MESSAGE[status]) {
      await notifyUser(
        item.request.requesterId,
        admin.organizationId,
        'PROCUREMENT_UPDATE',
        'Item update',
        `Your requested item "${itemLabel}" ${STAGE_MESSAGE[status]}.`,
        `/requests/${item.requestId}`
      )
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError(e.message)
  }
}
