import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    const tool = await db.tool.findUnique({
      where: { id: params.id },
      include: {
        checkouts: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            project: true,
          },
          orderBy: { checkoutDate: 'desc' },
        },
      },
    })
    if (!tool) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    return NextResponse.json(tool)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const body = await req.json()
    const { name, description, category, imageUrl, type, totalStock, minStock, maxStock, active } = body

    const existing = await db.tool.findUnique({ where: { id: params.id } })
    if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const stockDiff = totalStock !== undefined ? parseInt(totalStock) - existing.totalStock : 0

    const tool = await db.tool.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(type !== undefined && { type: type === 'MATERIAL' ? 'MATERIAL' : 'TOOL' }),
        ...(totalStock !== undefined && { totalStock: parseInt(totalStock) }),
        ...(totalStock !== undefined && { currentStock: Math.max(0, existing.currentStock + stockDiff) }),
        ...(minStock !== undefined && { minStock: parseInt(minStock) }),
        ...(maxStock !== undefined && { maxStock: parseInt(maxStock) }),
        ...(active !== undefined && { active }),
      },
    })

    await logAudit(user.id, 'UPDATE_TOOL', 'Tool', tool.id, `Updated tool: ${tool.name}`)
    return NextResponse.json(tool)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ADMIN'])
    await db.tool.update({ where: { id: params.id }, data: { active: false } })
    await logAudit(user.id, 'DELETE_TOOL', 'Tool', params.id, `Deactivated tool ${params.id}`)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
