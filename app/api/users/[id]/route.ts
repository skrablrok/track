import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { requireRole, logAudit, unauthorized, serverError } from '@/lib/utils'

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
