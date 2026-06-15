import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const request = await db.request.findUnique({
      where: { id: params.id },
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
