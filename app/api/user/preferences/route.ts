import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'
import { LANGUAGES } from '@/lib/i18n/translations'

export async function GET() {
  try {
    const user = await requireAuth()
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { emailNotifications: true, language: true },
    })
    return NextResponse.json({
      emailNotifications: record?.emailNotifications ?? false,
      language: record?.language ?? 'sl',
    })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { emailNotifications, language } = await req.json()

    const data: { emailNotifications?: boolean; language?: string } = {}
    if (typeof emailNotifications === 'boolean') data.emailNotifications = emailNotifications
    if (typeof language === 'string' && language in LANGUAGES) data.language = language

    await db.user.update({ where: { id: user.id }, data })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
