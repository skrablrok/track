import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'
import { extractReceiptData } from '@/lib/receipt-extraction'

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

    const extracted = await extractReceiptData(photoUrl)
    if (extracted) {
      purchase = await db.purchase.update({
        where: { id: purchase.id },
        data: { items: extracted.items, totalPrice: extracted.totalPrice },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      })
    }

    await logAudit(user.id, 'CREATE_PURCHASE', 'Purchase', purchase.id,
      `${user.name} logged an independent purchase`, user.organizationId)

    await notifyAdmins(
      user.organizationId,
      'PURCHASE_LOGGED',
      'New Purchase Logged',
      note?.trim()
        ? `${user.name} logged a purchase: ${note.trim()}`
        : `${user.name} logged a new purchase receipt`,
      '/purchases'
    )

    return NextResponse.json(purchase, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
