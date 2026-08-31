import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError, badRequest } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return badRequest('Invalid subscription')
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) return badRequest('Missing endpoint')

    await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
