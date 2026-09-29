import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'
import { matchReceiptToCatalog, type CatalogMatchResult } from '@/lib/receipt-extraction'

function sanitizeItems(raw: unknown): CatalogMatchResult['items'] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((it: any) => ({
      name: typeof it?.name === 'string' ? it.name.trim() : '',
      quantity: Number(it?.quantity),
      unitPrice: Number.isFinite(Number(it?.unitPrice)) ? Number(it.unitPrice) : 0,
      toolId: typeof it?.toolId === 'string' ? it.toolId : '',
      isMaterial: !!it?.isMaterial,
    }))
    .filter((it) => it.name && Number.isFinite(it.quantity) && it.quantity > 0)
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)

    const purchases = await db.purchase.findMany({
      where: {
        organizationId: user.organizationId,
        ...(!isPrivileged && { userId: user.id }),
        ...(isPrivileged && userId && { userId }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(purchases)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)

    const body = await req.json()
    const { photoUrl, note, items: reviewedItems, totalPrice: reviewedTotal } = body

    if (!photoUrl || typeof photoUrl !== 'string') {
      return badRequest('A receipt photo is required')
    }

    let purchase = await db.purchase.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        photoUrl,
        note: note?.trim() || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    // The client normally already extracted and let the user review/correct the
    // items via POST /api/purchases/extract, so we trust that list here instead of
    // re-running recognition. Older callers that skip straight to this endpoint
    // (no `items` field) still get auto-extraction as a fallback.
    let matched: CatalogMatchResult | null
    if (Array.isArray(reviewedItems)) {
      matched = { items: sanitizeItems(reviewedItems), totalPrice: Number.isFinite(Number(reviewedTotal)) ? Number(reviewedTotal) : 0 }
    } else {
      const catalog = await db.tool.findMany({
        where: { organizationId: user.organizationId, active: true },
        select: { id: true, name: true },
      })
      matched = await matchReceiptToCatalog(photoUrl, catalog)
    }

    const addedItems: { toolId: string; name: string; qty: number; isMaterial: boolean; isNew: boolean }[] = []

    if (matched) {
      purchase = await db.purchase.update({
        where: { id: purchase.id },
        data: { items: matched.items, totalPrice: matched.totalPrice },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      })

      await db.$transaction(async (tx) => {
        for (const item of matched.items) {
          const qty = Math.max(1, Math.round(item.quantity))
          let tool = item.toolId
            ? await tx.tool.findFirst({ where: { id: item.toolId, organizationId: user.organizationId } })
            : null
          const isNew = !tool

          if (!tool) {
            tool = await tx.tool.create({
              data: {
                name: item.name,
                type: item.isMaterial ? 'MATERIAL' : 'TOOL',
                currentStock: 0,
                totalStock: 0,
                minStock: item.isMaterial ? 5 : 2,
                maxStock: 10,
                organizationId: user.organizationId,
                active: true,
              },
            })
          }

          if (isPrivileged) {
            // An admin/manager is restocking the warehouse, not buying for their own
            // use — the units go straight into available stock for everyone.
            const newCurrentStock = tool.currentStock + qty
            await tx.tool.update({
              where: { id: tool.id },
              data: { currentStock: newCurrentStock, totalStock: Math.max(tool.totalStock, newCurrentStock) },
            })
          } else {
            // The item is simultaneously stocked and handed to the buyer, so currentStock
            // is unaffected — only raise totalStock to reflect a new unit now exists.
            await tx.tool.update({
              where: { id: tool.id },
              data: { totalStock: Math.max(tool.totalStock, tool.currentStock + qty) },
            })

            await tx.checkout.create({
              data: {
                toolId: tool.id,
                userId: user.id,
                quantity: qty,
                notes: 'Via purchase receipt',
                status: item.isMaterial ? 'CONSUMED' : 'ACTIVE',
                organizationId: user.organizationId,
                purchaseId: purchase.id,
                ...(item.isMaterial && { returnDate: new Date() }),
              },
            })
          }

          addedItems.push({ toolId: tool.id, name: tool.name, qty, isMaterial: item.isMaterial, isNew })
        }
      })
    }

    await logAudit(user.id, 'CREATE_PURCHASE', 'Purchase', purchase.id,
      `${user.name} logged a purchase${addedItems.length > 0 ? ` and added ${addedItems.length} item(s) to inventory` : ''}`,
      user.organizationId)

    await notifyAdmins(
      user.organizationId,
      { type: 'PURCHASE_LOGGED', userName: user.name as string, note: note?.trim() || null },
      '/purchases'
    )

    return NextResponse.json({ ...purchase, addedItems }, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
