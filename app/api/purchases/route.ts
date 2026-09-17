import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'
import { matchReceiptToCatalog } from '@/lib/receipt-extraction'

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

    const body = await req.json()
    const { photoUrl, note } = body

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

    const catalog = await db.tool.findMany({
      where: { organizationId: user.organizationId, active: true },
      select: { id: true, name: true },
    })
    const matched = await matchReceiptToCatalog(photoUrl, catalog)

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
          let tool = item.toolId ? await tx.tool.findUnique({ where: { id: item.toolId } }) : null
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
