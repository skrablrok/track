import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, unauthorized, forbidden, serverError } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const items = await db.requestItem.findMany({
      where: {
        procurementStatus: status ? status : { not: null },
        request: { organizationId: user.organizationId },
      },
      include: {
        tool: { select: { id: true, name: true, imageUrl: true, currentStock: true } },
        request: {
          select: {
            id: true,
            createdAt: true,
            requester: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { procurementUpdatedAt: 'desc' },
    })

    return NextResponse.json(items)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError()
  }
}
