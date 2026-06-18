import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { badRequest, serverError } from '@/lib/utils'

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{15,}$/

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, yourName, email, password } = await req.json()

    if (!companyName?.trim()) return badRequest('Company name is required')
    if (!yourName?.trim()) return badRequest('Your name is required')
    if (!email?.trim()) return badRequest('Email is required')
    if (!password || !PASSWORD_RE.test(password)) {
      return badRequest(
        'Password must be at least 15 characters and include an uppercase letter, a number, and a special character'
      )
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return badRequest('An account with this email already exists')

    let slug = slugify(companyName)
    if (!slug) slug = `org-${Date.now()}`

    const slugExists = await db.organization.findUnique({ where: { slug } })
    if (slugExists) slug = `${slug}-${Date.now()}`

    const hashed = await bcrypt.hash(password, 12)

    const org = await db.organization.create({
      data: {
        name: companyName.trim(),
        slug,
        plan: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    await db.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: yourName.trim(),
        password: hashed,
        role: 'ADMIN',
        setupComplete: true,
        organizationId: org.id,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    console.error('Register error:', e)
    return serverError()
  }
}
