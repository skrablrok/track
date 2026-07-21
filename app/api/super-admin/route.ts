import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function isSuperAdmin(email: string | null | undefined): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  return !!superAdminEmail && !!email && email.toLowerCase() === superAdminEmail.toLowerCase()
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session?.user?.email)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { users: true, tools: true, projects: true, requests: true },
      },
    },
  })

  return NextResponse.json(orgs)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session?.user?.email)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const { orgId, active } = await req.json()
  if (!orgId || active === undefined) {
    return new Response(JSON.stringify({ error: 'orgId and active are required' }), { status: 400 })
  }

  const org = await db.organization.update({
    where: { id: orgId },
    data: { active },
  })

  return NextResponse.json(org)
}
