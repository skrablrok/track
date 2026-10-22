import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const tool = await db.tool.findFirst({ where: { id: params.id, organizationId: user.organizationId } })
    if (!tool) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const units = await db.toolSerialUnit.findMany({
      where: { toolId: params.id, organizationId: user.organizationId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(units)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError()
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const { serialNumber } = await req.json()
    const trimmed = typeof serialNumber === 'string' ? serialNumber.trim() : ''
    if (!trimmed) return badRequest('A serial number is required')

    const tool = await db.tool.findFirst({ where: { id: params.id, organizationId: user.organizationId } })
    if (!tool) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    if (tool.type === 'MATERIAL') return badRequest('Materials cannot have serial numbers')

    const duplicate = await db.toolSerialUnit.findFirst({
      where: { organizationId: user.organizationId, serialNumber: { equals: trimmed, mode: 'insensitive' } },
      include: { tool: { select: { name: true } } },
    })
    if (duplicate) {
      return badRequest(`Serial number already registered to "${duplicate.tool.name}"`)
    }

    const unit = await db.toolSerialUnit.create({
      data: { toolId: params.id, serialNumber: trimmed, organizationId: user.organizationId },
    })

    await logAudit(user.id, 'ADD_SERIAL', 'Tool', params.id, `${user.name} registered serial ${trimmed} for ${tool.name}`, user.organizationId)

    const registeredCount = await db.toolSerialUnit.count({ where: { toolId: params.id, organizationId: user.organizationId } })
    const warning = registeredCount > tool.totalStock
      ? `${registeredCount} serial numbers registered but stock is only ${tool.totalStock}`
      : null

    return NextResponse.json({ unit, warning }, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError()
  }
}
