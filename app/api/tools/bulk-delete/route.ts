export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) return badRequest('No IDs provided')

    const result = await db.tool.updateMany({
      where: { id: { in: ids }, organizationId: user.organizationId, active: true },
      data: { active: false },
    })

    await logAudit(
      user.id, 'BULK_DELETE_TOOLS', 'Tool', undefined,
      `Bulk-deleted ${result.count} tool(s)/material(s)`,
      user.organizationId
    )
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError()
  }
}
