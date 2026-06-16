import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')
    const requesterId = searchParams.get('requesterId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)

    const requests = await db.request.findMany({
      where: {
        ...(!isPrivileged && { requesterId: user.id }),
        ...(isPrivileged && requesterId && { requesterId }),
        ...(status && { status }),
        ...(projectId && { projectId }),
        ...(from && { createdAt: { gte: new Date(from) } }),
        ...(to && { createdAt: { lte: new Date(to) } }),
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, location: true } },
        items: {
          include: { tool: { select: { id: true, name: true, imageUrl: true, category: true, currentStock: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    // Only FOREMAN, EMPLOYEE, MANAGER, ADMIN can create requests
    const body = await req.json()
    const { projectId, notes, items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return badRequest('At least one item is required')
    }

    for (const item of items) {
      const hasTool = !!item.toolId
      const hasCustomName = typeof item.itemName === 'string' && item.itemName.trim().length > 0
      if ((!hasTool && !hasCustomName) || !item.requestedQty || item.requestedQty < 1) {
        return badRequest('Each item needs a tool or a custom item name, and quantity ≥ 1')
      }
    }

    const request = await db.request.create({
      data: {
        requesterId: user.id,
        projectId: projectId || null,
        notes,
        status: 'PENDING',
        items: {
          create: items.map((i: any) => ({
            toolId: i.toolId || null,
            itemName: i.toolId ? null : String(i.itemName).trim(),
            requestedQty: parseInt(i.requestedQty),
            notes: i.notes || null,
          })),
        },
      },
      include: {
        requester: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        items: { include: { tool: { select: { id: true, name: true } } } },
      },
    })

    await logAudit(user.id, 'CREATE_REQUEST', 'Request', request.id,
      `${user.name} submitted request for ${items.length} item(s)`)

    // Notify all admins and managers
    const projectName = request.project?.name || 'no project'
    const customItemCount = items.filter((i: any) => !i.toolId).length
    await notifyAdmins(
      'REQUEST_SUBMITTED',
      customItemCount > 0 ? '⚠️ Item Needed — Not In Stock' : 'New Tool Request',
      customItemCount > 0
        ? `${user.name} requested ${items.length} item(s) for ${projectName} — ${customItemCount} item(s) not in inventory and will need to be sourced`
        : `${user.name} requested ${items.length} item(s) for ${projectName}`,
      `/requests/${request.id}`
    )

    return NextResponse.json(request, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
