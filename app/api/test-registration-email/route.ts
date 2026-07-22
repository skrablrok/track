import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils'
import { sendNewOrgNotificationEmail } from '@/lib/email'

export async function GET() {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'WORKER'])

    const smtpUser       = process.env.SMTP_USER
    const smtpPass       = process.env.SMTP_PASS
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL

    const config = {
      SMTP_USER:        smtpUser        ? '✓ set' : '✗ MISSING',
      SMTP_PASS:        smtpPass        ? '✓ set' : '✗ MISSING',
      SUPER_ADMIN_EMAIL: superAdminEmail ? `✓ set (${superAdminEmail})` : '✗ MISSING',
    }

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ ok: false, config, error: 'SMTP credentials missing' })
    }
    if (!superAdminEmail) {
      return NextResponse.json({ ok: false, config, error: 'SUPER_ADMIN_EMAIL missing' })
    }

    await sendNewOrgNotificationEmail(superAdminEmail, {
      orgName: 'Test Company',
      adminName: 'Test User',
      adminEmail: 'test@example.com',
      registeredAt: new Date(),
    })

    return NextResponse.json({ ok: true, config, sentTo: superAdminEmail })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
