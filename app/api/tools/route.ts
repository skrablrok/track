import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, logAudit, badRequest, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const lowStock = searchParams.get('lowStock') === 'true'

    const allTools = await db.tool.findMany({
      where: {
        active: true,
        ...(category && { category }),
        ...(search && { name: { contains: search } }),
      },
      include: {
        checkouts: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true, location: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const tools = lowStock ? allTools.filter((t) => t.currentStock <= t.minStock) : allTools
    return NextResponse.json(tools)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const body = await req.json()
    const { name, description, category, imageUrl, totalStock, minStock, maxStock } = body

    if (!name) return badRequest('Tool name is required')

    const stock = parseInt(totalStock) || 1
    const tool = await db.tool.create({
      data: {
        name,
        description,
        category,
        imageUrl,
        totalStock: stock,
        currentStock: stock,
        minStock: parseInt(minStock) || 2,
        maxStock: parseInt(maxStock) || 10,
      },
    })

    await logAudit(user.id, 'CREATE_TOOL', 'Tool', tool.id, `Created tool: ${name}`)

    return NextResponse.json(tool, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
