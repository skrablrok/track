import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'
import { matchReceiptItems } from '@/lib/receipt-extraction'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'MANAGER'])
    const { ids, photoUrl } = await req.json()

    if (!Array.isArray(ids) || ids.length === 0) return badRequest('No items selected')
    if (!photoUrl || typeof photoUrl !== 'string') return badRequest('A receipt photo is required')

    const items = await db.requestItem.findMany({
      where: { id: { in: ids }, request: { organizationId: admin.organizationId } },
      include: { tool: { select: { name: true } } },
    })

    if (items.length !== ids.length) return badRequest('Some items were not found')
    if (items.some((i) => i.procurementStatus !== 'ORDERED')) {
      return badRequest('All selected items must be Ordered')
    }

    const expected = items.map((i) => ({ id: i.id, name: i.tool?.name || i.itemName || 'item' }))
    const result = await matchReceiptItems(photoUrl, expected)
    if (!result) return badRequest('Could not read the receipt, please retake the photo')

    const foundIds = new Set(result.matches.filter((m) => m.found).map((m) => m.expectedId))
    const matchedItems = items.filter((i) => foundIds.has(i.id))
    const unmatchedItems = items.filter((i) => !foundIds.has(i.id))

    const purchase = await db.purchase.create({
      data: {
        userId: admin.id,
        organizationId: admin.organizationId,
        photoUrl,
        items: result.items,
        totalPrice: result.totalPrice,
      },
    })

    await db.$transaction([
      ...(matchedItems.length > 0
        ? [
            db.requestItem.updateMany({
              where: { id: { in: matchedItems.map((i) => i.id) } },
              data: { procurementStatus: 'COMPLETED', procurementUpdatedAt: new Date(), purchaseId: purchase.id },
            }),
          ]
        : []),
      ...(unmatchedItems.length > 0
        ? [
            db.requestItem.updateMany({
              where: { id: { in: unmatchedItems.map((i) => i.id) } },
              data: { procurementStatus: 'NOT_ON_RECEIPT', procurementUpdatedAt: new Date(), purchaseId: purchase.id },
            }),
          ]
        : []),
    ])

    await logAudit(
      admin.id,
      'PROCUREMENT_RECEIPT_VERIFIED',
      'Purchase',
      purchase.id,
      `${admin.name} verified a receipt: ${matchedItems.length} matched, ${unmatchedItems.length} not found`,
      admin.organizationId
    )

    if (unmatchedItems.length > 0) {
      await notifyAdmins(
        admin.organizationId,
        { type: 'PROCUREMENT_MISMATCH', itemNames: unmatchedItems.map((i) => i.tool?.name || i.itemName || 'item') },
        '/admin/procurement'
      )
    }

    return NextResponse.json({
      matched: matchedItems.length,
      unmatched: unmatchedItems.length,
      matchedIds: matchedItems.map((i) => i.id),
      unmatchedIds: unmatchedItems.map((i) => i.id),
    })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError(e.message)
  }
}
