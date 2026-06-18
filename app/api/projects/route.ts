import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const projects = await db.project.findMany({
      where: { organizationId: user.organizationId, ...(status && { status: status as any }) },
      include: {
        _count: { select: { checkouts: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(projects)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const body = await req.json()
    const { name, location, description } = body
    if (!name) return badRequest('Project name is required')

    const project = await db.project.create({
      data: { name, location, description, organizationId: user.organizationId },
    })

    await logAudit(user.id, 'CREATE_PROJECT', 'Project', project.id, `Created project: ${name}`)
    return NextResponse.json(project, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
