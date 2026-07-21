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
        organizationId: user.organizationId,
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
        warehouseStocks: { orderBy: { warehouse: 'asc' } },
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
    const { name, description, category, imageUrl, type, totalStock, minStock, maxStock, warehouseStocks } = body

    if (!name) return badRequest('Tool name is required')

    const stocks = Array.isArray(warehouseStocks)
      ? warehouseStocks.filter((w: any) => w.warehouse?.trim() && parseInt(w.quantity) > 0)
      : []
    const computedTotal = stocks.length > 0
      ? stocks.reduce((sum: number, w: any) => sum + parseInt(w.quantity), 0)
      : parseInt(totalStock) || 1

    const tool = await db.tool.create({
      data: {
        name,
        description,
        category,
        imageUrl,
        type: type === 'MATERIAL' ? 'MATERIAL' : 'TOOL',
        totalStock: computedTotal,
        currentStock: computedTotal,
        minStock: parseInt(minStock) || (type === 'MATERIAL' ? 5 : 2),
        maxStock: parseInt(maxStock) || 10,
        organizationId: user.organizationId,
        ...(stocks.length > 0 && {
          warehouseStocks: {
            create: stocks.map((w: any) => ({
              warehouse: w.warehouse.trim(),
              quantity: parseInt(w.quantity),
            })),
          },
        }),
      },
      include: { warehouseStocks: true },
    })

    await logAudit(user.id, 'CREATE_TOOL', 'Tool', tool.id, `Created tool: ${name}`, user.organizationId)

    return NextResponse.json(tool, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
