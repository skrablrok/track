import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

export async function GET() {
  try {
    const user = await requireAuth()
    const rows = await db.toolWarehouseStock.findMany({
      where: { tool: { organizationId: user.organizationId } },
      distinct: ['warehouse'],
      select: { warehouse: true },
      orderBy: { warehouse: 'asc' },
    })
    return NextResponse.json(rows.map((r) => r.warehouse))
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
