import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: true }) // don't reveal anything
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, active: true, setupComplete: true },
    })

    // Always return ok — never reveal whether email exists
    if (!user || !user.active || !user.setupComplete) {
      return NextResponse.json({ ok: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await sendPasswordResetEmail(user.email, token).catch((e) =>
        console.error('Password reset email failed:', e)
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // never expose errors
  }
}
