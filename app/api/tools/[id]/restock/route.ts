import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const { amount } = await req.json()
    const qty = parseInt(amount)
    if (!qty || qty <= 0) return badRequest('Amount must be a positive number')

    const existing = await db.tool.findFirst({ where: { id: params.id, organizationId: user.organizationId } })
    if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const newCurrentStock = existing.currentStock + qty
    const newTotalStock = Math.max(existing.totalStock, newCurrentStock)

    const tool = await db.tool.update({
      where: { id: params.id },
      data: {
        currentStock: newCurrentStock,
        totalStock: newTotalStock,
      },
    })

    await logAudit(user.id, 'RESTOCK', 'Tool', tool.id, `Restocked ${tool.name} +${qty} units (stock: ${existing.currentStock} → ${newCurrentStock})`, user.organizationId)
    return NextResponse.json(tool)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
