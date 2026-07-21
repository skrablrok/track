import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const count = await db.notification.count({
      where: { userId: user.id, organizationId: user.organizationId, read: false },
    })
    return NextResponse.json({ count })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
