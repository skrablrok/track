import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        organizationId: user.organizationId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json(notifications)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { ids, all } = body

    if (all) {
      await db.notification.updateMany({
        where: { userId: user.id, organizationId: user.organizationId, read: false },
        data: { read: true },
      })
    } else if (ids && Array.isArray(ids)) {
      await db.notification.updateMany({
        where: { id: { in: ids }, userId: user.id, organizationId: user.organizationId },
        data: { read: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
