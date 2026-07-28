export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, forbidden, serverError, unauthorized } from '@/lib/utils'

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN'])
    const { logoUrl } = await req.json()
    await db.organization.update({
      where: { id: user.organizationId },
      data: { logoUrl: logoUrl ?? null },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError(e.message)
  }
}
