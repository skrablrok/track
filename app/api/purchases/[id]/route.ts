import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError } from '@/lib/utils'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()

    const purchase = await db.purchase.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
    })
    if (!purchase) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)
    if (!isPrivileged && purchase.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    await db.purchase.delete({ where: { id: params.id } })

    await logAudit(user.id, 'DELETE_PURCHASE', 'Purchase', params.id, `Deleted purchase ${params.id}`, user.organizationId)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
