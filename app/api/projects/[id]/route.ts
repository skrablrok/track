import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, logAudit, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const project = await db.project.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
      include: {
        foreman: { select: { id: true, name: true } },
        checkouts: {
          include: {
            tool: { select: { id: true, name: true, imageUrl: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { checkoutDate: 'desc' },
        },
      },
    })
    if (!project) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    return NextResponse.json(project)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const body = await req.json()
    const existing = await db.project.findFirst({ where: { id: params.id, organizationId: user.organizationId } })
    if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const project = await db.project.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        ...(body.foremanId !== undefined && { foremanId: body.foremanId || null }),
      },
    })
    await logAudit(user.id, 'UPDATE_PROJECT', 'Project', project.id, `Updated project: ${project.name}`, user.organizationId)
    return NextResponse.json(project)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
