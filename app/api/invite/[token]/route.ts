import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { badRequest, serverError } from '@/lib/utils'

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{15,}$/

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const user = await db.user.findUnique({
      where: { inviteToken: params.token },
      select: { email: true, inviteExpiry: true, setupComplete: true },
    })

    if (!user || user.setupComplete) return NextResponse.json({ valid: false, reason: 'invalid' })
    if (user.inviteExpiry && user.inviteExpiry < new Date()) return NextResponse.json({ valid: false, reason: 'expired' })

    return NextResponse.json({ valid: true, email: user.email })
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { name, password } = await req.json()

    if (!name?.trim()) return badRequest('Name is required')
    if (!password || !PASSWORD_RE.test(password)) {
      return badRequest('Password must be at least 15 characters and include an uppercase letter, a number, and a special character')
    }

    const user = await db.user.findUnique({ where: { inviteToken: params.token } })

    if (!user || user.setupComplete) return badRequest('Invalid or already used invite link')
    if (user.inviteExpiry && user.inviteExpiry < new Date()) return badRequest('Invite link has expired')

    const hashed = await bcrypt.hash(password, 12)
    await db.user.update({
      where: { id: user.id },
      data: { name: name.trim(), password: hashed, setupComplete: true, inviteToken: null, inviteExpiry: null },
    })

    return NextResponse.json({ success: true })
  } catch {
    return serverError()
  }
}
