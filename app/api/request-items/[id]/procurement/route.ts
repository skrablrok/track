import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'
import { notifyUser } from '@/lib/notifications'

const STAGES = ['PENDING_PURCHASE', 'ORDERED', 'RECEIVED', 'COMPLETED', 'NOT_ON_RECEIPT']
const NOTIFY_STAGES = ['ORDERED', 'RECEIVED', 'COMPLETED'] as const

// Normal sequential advance, plus manual recovery moves out of NOT_ON_RECEIPT
// (set by the bulk receipt-verification flow when an ordered item isn't found on the receipt).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING_PURCHASE: ['ORDERED'],
  ORDERED: ['RECEIVED'],
  RECEIVED: ['COMPLETED'],
  COMPLETED: [],
  NOT_ON_RECEIPT: ['ORDERED', 'PENDING_PURCHASE'],
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

    if (!ALLOWED_TRANSITIONS[item.procurementStatus]?.includes(status)) {
      return badRequest(`Cannot move from ${item.procurementStatus} to ${status}`)
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

    if ((NOTIFY_STAGES as readonly string[]).includes(status)) {
      await notifyUser(
        item.request.requesterId,
        admin.organizationId,
        { type: 'PROCUREMENT_UPDATE', itemLabel, stage: status as 'ORDERED' | 'RECEIVED' | 'COMPLETED' },
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
