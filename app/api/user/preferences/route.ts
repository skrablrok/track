import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

export async function GET() {
  try {
    const user = await requireAuth()
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { emailNotifications: true },
    })
    return NextResponse.json({ emailNotifications: record?.emailNotifications ?? false })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { emailNotifications } = await req.json()

    await db.user.update({
      where: { id: user.id },
      data: { emailNotifications: !!emailNotifications },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
