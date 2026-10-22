import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'

export async function DELETE(req: NextRequest, { params }: { params: { id: string; serialId: string } }) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])

    const unit = await db.toolSerialUnit.findFirst({
      where: { id: params.serialId, toolId: params.id, organizationId: user.organizationId },
    })
    if (!unit) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    if (unit.status === 'IN_USE') {
      return badRequest('Cannot remove a serial number that is currently in use')
    }

    await db.toolSerialUnit.delete({ where: { id: unit.id } })
    await logAudit(user.id, 'REMOVE_SERIAL', 'Tool', params.id, `${user.name} removed serial ${unit.serialNumber}`, user.organizationId)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError()
  }
}
