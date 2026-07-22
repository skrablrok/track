export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function isSuperAdmin(email: string | null | undefined): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  return !!superAdminEmail && !!email && email.toLowerCase() === superAdminEmail.toLowerCase()
}

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session?.user?.email)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const { orgId } = params

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      tools: {
        select: { id: true, name: true, category: true, type: true, currentStock: true, totalStock: true, active: true },
        orderBy: { name: 'asc' },
      },
      projects: {
        select: { id: true, name: true, location: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      requests: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { name: true } },
          _count: { select: { items: true } },
        },
      },
      _count: {
        select: { users: true, tools: true, projects: true, requests: true, checkouts: true },
      },
    },
  })

  if (!org) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

  return NextResponse.json(org)
}

export async function DELETE(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session?.user?.email)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const { orgId } = params

  await db.$transaction(async (tx) => {
    // Delete in dependency order
    const requests = await tx.request.findMany({ where: { organizationId: orgId }, select: { id: true } })
    const requestIds = requests.map((r) => r.id)
    if (requestIds.length) await tx.requestItem.deleteMany({ where: { requestId: { in: requestIds } } })

    await tx.request.deleteMany({ where: { organizationId: orgId } })
    await tx.notification.deleteMany({ where: { organizationId: orgId } })
    await tx.auditLog.deleteMany({ where: { organizationId: orgId } })
    await tx.checkout.deleteMany({ where: { organizationId: orgId } })

    const tools = await tx.tool.findMany({ where: { organizationId: orgId }, select: { id: true } })
    const toolIds = tools.map((t) => t.id)
    if (toolIds.length) await tx.toolWarehouseStock.deleteMany({ where: { toolId: { in: toolIds } } })

    await tx.tool.deleteMany({ where: { organizationId: orgId } })
    await tx.project.deleteMany({ where: { organizationId: orgId } })
    await tx.user.deleteMany({ where: { organizationId: orgId } })
    await tx.organization.delete({ where: { id: orgId } })
  })

  return NextResponse.json({ ok: true })
}
