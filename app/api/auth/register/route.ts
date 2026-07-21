import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { badRequest, serverError } from '@/lib/utils'
import { sendNewOrgNotificationEmail } from '@/lib/email'

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

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) return badRequest('This email is already registered')

    let baseSlug = slugify(orgName.trim()) || 'org'
    let slug = baseSlug
    let suffix = 1
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // New orgs start as inactive — super admin must approve before anyone can log in
    const { org, user } = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName.trim(), slug, active: false },
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
        details: `New organization registered (pending approval): ${org.name} by ${user.email}`,
      },
    })

    // Notify super admin by email if configured
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
    let emailError: string | null = null
    if (!superAdminEmail) {
      emailError = 'SUPER_ADMIN_EMAIL is not configured on this server'
      console.error(emailError)
    } else if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      emailError = 'SMTP_USER or SMTP_PASS is not configured on this server'
      console.error(emailError)
    } else {
      try {
        await sendNewOrgNotificationEmail(superAdminEmail, {
          orgName: org.name,
          adminName: name.trim(),
          adminEmail: email.trim().toLowerCase(),
          registeredAt: new Date(),
        })
      } catch (e: any) {
        emailError = e.message
        console.error('Super-admin notification email failed:', e)
      }
    }

    return NextResponse.json({ success: true, pending: true, emailError }, { status: 201 })
  } catch (e: any) {
    console.error('Registration error:', e)
    return serverError(e.message)
  }
}
