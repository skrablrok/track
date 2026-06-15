import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { sendInviteEmail } from '@/lib/email'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER'])
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, setupComplete: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(users)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN'])
    const body = await req.json()
    const { email, role } = body

    if (!email) return badRequest('Email is required')

    // If user already exists but hasn't completed setup, resend invite
    const existing = await db.user.findUnique({ where: { email } })
    if (existing && existing.setupComplete) return badRequest('Email already in use')

    const inviteToken = crypto.randomBytes(32).toString('hex')
    const inviteExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const appUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
    const inviteUrl = `${appUrl}/invite/${inviteToken}`

    let user
    if (existing) {
      user = await db.user.update({
        where: { email },
        data: { inviteToken, inviteExpiry, role: role || existing.role },
        select: { id: true, email: true, name: true, role: true, active: true, setupComplete: true, createdAt: true },
      })
    } else {
      user = await db.user.create({
        data: { email, name: '', password: '', role: role || 'EMPLOYEE', setupComplete: false, inviteToken, inviteExpiry },
        select: { id: true, email: true, name: true, role: true, active: true, setupComplete: true, createdAt: true },
      })
    }

    // Try to send email — if SMTP is not configured, return invite URL for manual sharing
    let emailSent = false
    let emailError = ''
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await sendInviteEmail(email, inviteToken)
        emailSent = true
      } catch (err: any) {
        emailError = err.message || 'Unknown error'
        console.error('Failed to send invite email:', emailError)
      }
    }

    await logAudit(admin.id, 'CREATE_USER', 'User', user.id, `Invited user: ${email}`)

    return NextResponse.json({ ...user, emailSent, inviteUrl: emailSent ? undefined : inviteUrl }, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
