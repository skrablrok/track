import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'
import { notifyUser } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'MANAGER'])
    const { ids } = await req.json()

    if (!Array.isArray(ids) || ids.length === 0) return badRequest('No items selected')

    const items = await db.requestItem.findMany({
      where: { id: { in: ids }, request: { organizationId: admin.organizationId } },
      include: { request: { include: { requester: true } }, tool: { select: { name: true } } },
    })

    if (items.length !== ids.length) return badRequest('Some items were not found')
    if (items.some((i) => i.procurementStatus !== 'PENDING_PURCHASE')) {
      return badRequest('All selected items must be Pending purchase')
    }

    await db.requestItem.updateMany({
      where: { id: { in: ids } },
      data: { procurementStatus: 'ORDERED', procurementUpdatedAt: new Date() },
    })

    await logAudit(
      admin.id,
      'PROCUREMENT_BULK_ORDERED',
      'RequestItem',
      undefined,
      `${admin.name} marked ${items.length} item(s) as ordered`,
      admin.organizationId
    )

    for (const item of items) {
      const itemLabel = item.tool?.name || item.itemName || 'item'
      await notifyUser(
        item.request.requesterId,
        admin.organizationId,
        { type: 'PROCUREMENT_UPDATE', itemLabel, stage: 'ORDERED' },
        `/requests/${item.requestId}`
      )
    }

    return NextResponse.json({ updated: items.length })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError(e.message)
  }
}
