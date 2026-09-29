import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError, badRequest } from '@/lib/utils'
import { matchReceiptToCatalog } from '@/lib/receipt-extraction'

// Reads a receipt photo and returns the recognized line items without
// saving anything, so the user can review and correct them before the
// purchase is actually logged and stock is touched.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    const { photoUrl } = await req.json()
    if (!photoUrl || typeof photoUrl !== 'string') {
      return badRequest('A receipt photo is required')
    }

    const catalog = await db.tool.findMany({
      where: { organizationId: user.organizationId, active: true },
      select: { id: true, name: true },
    })
    const matched = await matchReceiptToCatalog(photoUrl, catalog)

    return NextResponse.json(matched || { items: [], totalPrice: 0 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
