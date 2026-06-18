import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'
import { sendProcurementEmail } from '@/lib/email'

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
        organizationId: user.organizationId,
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

    // Look up current stock for any referenced tools, to flag insufficient-stock items for procurement
    // and to enforce the "can't request more tool units than the warehouse has" cap
    const toolIds = items.filter((i: any) => i.toolId).map((i: any) => i.toolId)
    const tools = toolIds.length
      ? await db.tool.findMany({ where: { id: { in: toolIds } }, select: { id: true, name: true, type: true, currentStock: true } })
      : []
    const toolById = new Map(tools.map((t) => [t.id, t]))

    for (const item of items) {
      const hasTool = !!item.toolId
      const hasCustomName = typeof item.itemName === 'string' && item.itemName.trim().length > 0
      if ((!hasTool && !hasCustomName) || !item.requestedQty || item.requestedQty < 1) {
        return badRequest('Each item needs a tool or a custom item name, and quantity ≥ 1')
      }
      if (hasTool) {
        const tool = toolById.get(item.toolId)
        if (tool && tool.type !== 'MATERIAL' && parseInt(item.requestedQty) > tool.currentStock) {
          return badRequest(`Cannot request more than what's in stock for "${tool.name}" (${tool.currentStock} available)`)
        }
      }
    }

    const needsProcurement = (i: any) => {
      if (!i.toolId) return true
      const tool = toolById.get(i.toolId)
      return !!tool && parseInt(i.requestedQty) > tool.currentStock
    }

    const request = await db.request.create({
      data: {
        requesterId: user.id,
        projectId: projectId || null,
        notes,
        status: 'PENDING',
        organizationId: user.organizationId,
        items: {
          create: items.map((i: any) => ({
            toolId: i.toolId || null,
            itemName: i.toolId ? null : String(i.itemName).trim(),
            requestedQty: parseInt(i.requestedQty),
            notes: i.notes || null,
            procurementStatus: needsProcurement(i) ? 'PENDING_PURCHASE' : null,
            procurementUpdatedAt: needsProcurement(i) ? new Date() : null,
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
    const neverStocked = items.filter((i: any) => !i.toolId).map((i: any) => ({ name: String(i.itemName).trim(), qty: parseInt(i.requestedQty) }))
    const lowStock = items
      .filter((i: any) => i.toolId && needsProcurement(i))
      .map((i: any) => ({ name: toolById.get(i.toolId)!.name, qty: parseInt(i.requestedQty), currentStock: toolById.get(i.toolId)!.currentStock }))
    const procurementCount = neverStocked.length + lowStock.length

    await notifyAdmins(
      user.organizationId,
      'REQUEST_SUBMITTED',
      procurementCount > 0 ? '⚠️ Item Needed — Not In Stock' : 'New Tool Request',
      procurementCount > 0
        ? `${user.name} requested ${items.length} item(s) for ${projectName} — ${procurementCount} item(s) need procurement: ${[...neverStocked.map((i) => i.name), ...lowStock.map((i) => `${i.name} (qty ${i.qty}, ${i.currentStock} in stock)`)].join(', ')}`
        : `${user.name} requested ${items.length} item(s) for ${projectName}`,
      `/requests/${request.id}`
    )

    if (procurementCount > 0) {
      const admins = await db.user.findMany({ where: { active: true, role: { in: ['ADMIN', 'MANAGER'] }, organizationId: user.organizationId }, select: { email: true } })
      await sendProcurementEmail(admins.map((a) => a.email), {
        requesterName: user.name as string,
        projectName,
        neverStocked,
        lowStock,
        linkUrl: `/requests/${request.id}`,
      })
    }

    return NextResponse.json(request, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
