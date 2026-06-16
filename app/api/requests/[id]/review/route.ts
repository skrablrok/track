import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { notifyUser, notifyAdmins } from '@/lib/notifications'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole(['ADMIN', 'MANAGER'])
    const body = await req.json()
    const { adminNotes, items } = body
    // items: [{ requestItemId, approvedQty }]

    if (!items || !Array.isArray(items)) return badRequest('Items are required')

    const request = await db.request.findUnique({
      where: { id: params.id },
      include: { items: { include: { tool: true } }, requester: true },
    })

    if (!request) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    if (request.status !== 'PENDING') return badRequest('Request has already been reviewed')

    // Calculate overall status
    const totalItems = items.length
    const approvedItems = items.filter((i: any) => parseInt(i.approvedQty) > 0)
    const fullyApproved = approvedItems.every((a: any) => {
      const original = request.items.find((ri) => ri.id === a.requestItemId)
      return original && parseInt(a.approvedQty) >= original.requestedQty
    })

    let status: string
    if (approvedItems.length === 0) status = 'REJECTED'
    else if (fullyApproved && approvedItems.length === totalItems) status = 'APPROVED'
    else status = 'PARTIALLY_APPROVED'

    // Update each request item + adjust stock
    const stockWarnings: string[] = []

    await db.$transaction(async (tx) => {
      for (const item of items) {
        const qty = parseInt(item.approvedQty) || 0
        await tx.requestItem.update({
          where: { id: item.requestItemId },
          data: { approvedQty: qty },
        })

        if (qty > 0 && item.toolId) {
          const tool = await tx.tool.update({
            where: { id: item.toolId },
            data: { currentStock: { decrement: qty } },
          })

          if (tool.currentStock < 0) {
            stockWarnings.push(`${tool.name}: stock is now ${tool.currentStock} (needs reorder)`)
          } else if (tool.currentStock <= tool.minStock) {
            stockWarnings.push(`${tool.name}: stock is low (${tool.currentStock} remaining)`)
          }

          // Create checkout record for approved items
          const isMaterial = tool.type === 'MATERIAL'
          await tx.checkout.create({
            data: {
              toolId: item.toolId,
              userId: request.requesterId,
              projectId: request.projectId,
              requestId: params.id,
              quantity: qty,
              notes: `Via approved request #${params.id.slice(-6).toUpperCase()}`,
              status: isMaterial ? 'CONSUMED' : 'ACTIVE',
              ...(isMaterial && { returnDate: new Date() }),
            },
          })
        }
      }

      await tx.request.update({
        where: { id: params.id },
        data: { status, adminNotes: adminNotes || null },
      })
    })

    await logAudit(
      admin.id, 'REVIEW_REQUEST', 'Request', params.id,
      `${admin.name} ${status} request from ${request.requester.name}`
    )

    // Notify the requester
    const statusLabel = { APPROVED: 'approved', PARTIALLY_APPROVED: 'partially approved', REJECTED: 'rejected' }[status] || status
    await notifyUser(
      request.requesterId,
      'REQUEST_REVIEWED',
      `Request ${statusLabel}`,
      `Your tool request has been ${statusLabel}${adminNotes ? `: "${adminNotes}"` : '.'}`,
      `/requests/${params.id}`
    )

    // Notify admins/managers if stock warnings exist
    if (stockWarnings.length > 0) {
      await notifyAdmins(
        'STOCK_NEGATIVE',
        '⚠️ Stock Replenishment Needed',
        stockWarnings.join(' | '),
        '/reports'
      )
    }

    const updated = await db.request.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { id: true, name: true } },
        project: true,
        items: { include: { tool: { select: { id: true, name: true, currentStock: true } } } },
      },
    })

    return NextResponse.json({ request: updated, stockWarnings })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError(e.message)
  }
}
