import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const request = await db.request.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        project: true,
        items: {
          include: {
            tool: {
              select: { id: true, name: true, imageUrl: true, category: true, currentStock: true, minStock: true, totalStock: true },
            },
          },
        },
      },
    })

    if (!request) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)
    if (!isPrivileged && request.requesterId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    return NextResponse.json(request)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()

    const request = await db.request.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
      include: { items: true },
    })
    if (!request) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)
    if (!isPrivileged && request.requesterId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
    if (request.status !== 'PENDING') {
      return new Response(JSON.stringify({ error: 'Only pending requests can be cancelled' }), { status: 400 })
    }

    await db.$transaction(async (tx) => {
      for (const item of request.items) {
        if (!item.toolId || item.reservedQty <= 0) continue
        await tx.tool.update({
          where: { id: item.toolId },
          data: { currentStock: { increment: item.reservedQty } },
        })
      }
      await tx.request.delete({ where: { id: params.id } })
    })

    await logAudit(user.id, 'CANCEL_REQUEST', 'Request', params.id, `Cancelled request ${params.id}`, user.organizationId)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
