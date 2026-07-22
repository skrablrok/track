export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function GET() {
  const smtpUser = process.env.SMTP_USER?.trim()
  const smtpPass = process.env.SMTP_PASS?.trim()

  const config = {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com (default)',
    SMTP_PORT: process.env.SMTP_PORT || '587 (default)',
    SMTP_USER: smtpUser || '✗ MISSING',
    SMTP_PASS_length: smtpPass?.length ?? 0,
  }

  if (!smtpUser || !smtpPass) {
    return NextResponse.json({ ok: false, config, error: 'SMTP credentials missing' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: smtpUser,
      to: smtpUser,
      subject: 'BuildFlow – SMTP test',
      text: 'If you receive this, SMTP is working.',
    })

    return NextResponse.json({ ok: true, config, sentTo: smtpUser })
  } catch (e: any) {
    return NextResponse.json({ ok: false, config, error: e.message })
  }
}
