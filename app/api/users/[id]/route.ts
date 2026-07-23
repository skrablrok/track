import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { requireRole, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole(['ADMIN'])
    const body = await req.json()
    const { name, role, active, password } = body

    // Ensure the target user is in the same org
    const target = await db.user.findFirst({ where: { id: params.id, organizationId: admin.organizationId } })
    if (!target) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const data: any = {}
    if (name) data.name = name
    if (role) data.role = role
    if (active !== undefined) data.active = active
    if (password) data.password = await bcrypt.hash(password, 12)

    const user = await db.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true },
    })

    await logAudit(admin.id, 'UPDATE_USER', 'User', user.id, `Updated user: ${user.email}`, admin.organizationId)
    return NextResponse.json(user)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole(['ADMIN'])
    if (params.id === admin.id) return badRequest('Cannot delete your own account')

    const target = await db.user.findFirst({ where: { id: params.id, organizationId: admin.organizationId } })
    if (!target) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    await db.$transaction(async (tx) => {
      // Nullable FKs — nullify to preserve history records
      await tx.auditLog.updateMany({ where: { userId: params.id }, data: { userId: null } })
      await tx.notification.deleteMany({ where: { userId: params.id } })
      // Remove as foreman from projects
      await tx.project.updateMany({ where: { foremanId: params.id }, data: { foremanId: null } })
      // Required FKs — delete the records
      const userRequests = await tx.request.findMany({ where: { requesterId: params.id }, select: { id: true } })
      if (userRequests.length > 0) {
        await tx.requestItem.deleteMany({ where: { requestId: { in: userRequests.map((r) => r.id) } } })
        await tx.request.deleteMany({ where: { requesterId: params.id } })
      }
      await tx.checkout.deleteMany({ where: { userId: params.id } })
      await tx.user.delete({ where: { id: params.id } })
    })

    await logAudit(admin.id, 'DELETE_USER', 'User', params.id, `Deleted user: ${target.email}`, admin.organizationId)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
