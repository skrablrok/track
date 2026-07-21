import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { badRequest, serverError } from '@/lib/utils'

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{15,}$/

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

export async function POST(req: NextRequest) {
  try {
    const { orgName, name, email, password } = await req.json()

    if (!orgName?.trim()) return badRequest('Organization name is required')
    if (!name?.trim()) return badRequest('Your name is required')
    if (!email?.trim()) return badRequest('Email is required')
    if (!password || !PASSWORD_RE.test(password)) {
      return badRequest('Password must be at least 15 characters with an uppercase letter, a number, and a special character')
    }

    // Check email not already used
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) return badRequest('This email is already registered')

    // Build a unique slug for the org
    let baseSlug = slugify(orgName.trim()) || 'org'
    let slug = baseSlug
    let suffix = 1
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const { org, user } = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName.trim(), slug },
      })
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password: hashedPassword,
          role: 'ADMIN',
          setupComplete: true,
          organizationId: org.id,
        },
      })
      return { org, user }
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        entity: 'Organization',
        entityId: org.id,
        organizationId: org.id,
        details: `New organization registered: ${org.name} by ${user.email}`,
      },
    })

    return NextResponse.json({ success: true, orgSlug: org.slug }, { status: 201 })
  } catch (e: any) {
    console.error('Registration error:', e)
    return serverError(e.message)
  }
}
