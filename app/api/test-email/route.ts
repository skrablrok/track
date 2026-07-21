import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils'
import nodemailer from 'nodemailer'

export async function GET() {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER', 'WORKER'])

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({
        ok: false,
        error: 'SMTP_USER or SMTP_PASS environment variable is not set on this server.',
        smtpUser: smtpUser ?? '(not set)',
      })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass.trim() },
    })

    await transporter.verify()

    await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: user.email as string,
      subject: 'BuildFlow – test email',
      html: '<p>If you received this, your SMTP configuration is working correctly.</p>',
    })

    return NextResponse.json({ ok: true, sentTo: user.email })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
