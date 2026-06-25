import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

export async function GET() {
  try {
    await requireAuth()
    const tools = await db.tool.findMany({
      where: { active: true, warehouse: { not: null } },
      select: { warehouse: true },
    })
    const warehouses = Array.from(new Set(tools.map((t) => t.warehouse).filter(Boolean))) as string[]
    return NextResponse.json(warehouses)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
