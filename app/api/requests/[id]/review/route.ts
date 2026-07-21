import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'
import { notifyUser, notifyAdmins } from '@/lib/notifications'
import { sendDeliveryNoteEmail } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole(['ADMIN', 'MANAGER'])
    const body = await req.json()
    const { adminNotes, items } = body

    if (!items || !Array.isArray(items)) return badRequest('Items are required')

    const request = await db.request.findFirst({
      where: { id: params.id, organizationId: admin.organizationId },
      include: { items: { include: { tool: true } }, requester: true },
    })

    if (!request) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    if (request.status !== 'PENDING') return badRequest('Request has already been reviewed')

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

    const stockWarnings: string[] = []

    await db.$transaction(async (tx) => {
      for (const item of items) {
        const qty = parseInt(item.approvedQty) || 0
        await tx.requestItem.update({
          where: { id: item.requestItemId },
          data: { approvedQty: qty },
        })

        const requestItem = request.items.find((ri) => ri.id === item.requestItemId)
        if (!requestItem?.toolId) continue

        const toolId = requestItem.toolId

        if (requestItem.reservedQty > 0) {
          const restoreQty = Math.max(0, requestItem.reservedQty - qty)
          if (restoreQty > 0) {
            await tx.tool.update({
              where: { id: toolId },
              data: { currentStock: { increment: restoreQty } },
            })
          }

          if (qty > 0) {
            const isMaterial = requestItem.tool?.type === 'MATERIAL'
            await tx.checkout.create({
              data: {
                toolId,
                userId: request.requesterId,
                projectId: request.projectId,
                requestId: params.id,
                quantity: qty,
                notes: `Via approved request #${params.id.slice(-6).toUpperCase()}`,
                status: isMaterial ? 'CONSUMED' : 'ACTIVE',
                organizationId: admin.organizationId,
                ...(isMaterial && { returnDate: new Date() }),
              },
            })
          }

          const updatedTool = await tx.tool.findUnique({
            where: { id: toolId },
            select: { name: true, currentStock: true, minStock: true },
          })
          if (updatedTool) {
            if (updatedTool.currentStock < 0) {
              stockWarnings.push(`${updatedTool.name}: stock is now ${updatedTool.currentStock} (needs reorder)`)
            } else if (updatedTool.currentStock <= updatedTool.minStock) {
              stockWarnings.push(`${updatedTool.name}: stock is low (${updatedTool.currentStock} remaining)`)
            }
          }
        } else {
          // Legacy path: request predates the reservation feature
          if (qty > 0) {
            const tool = await tx.tool.update({
              where: { id: toolId },
              data: { currentStock: { decrement: qty } },
            })

            if (tool.currentStock < 0) {
              stockWarnings.push(`${tool.name}: stock is now ${tool.currentStock} (needs reorder)`)
            } else if (tool.currentStock <= tool.minStock) {
              stockWarnings.push(`${tool.name}: stock is low (${tool.currentStock} remaining)`)
            }

            const isMaterial = tool.type === 'MATERIAL'
            await tx.checkout.create({
              data: {
                toolId,
                userId: request.requesterId,
                projectId: request.projectId,
                requestId: params.id,
                quantity: qty,
                notes: `Via approved request #${params.id.slice(-6).toUpperCase()}`,
                status: isMaterial ? 'CONSUMED' : 'ACTIVE',
                organizationId: admin.organizationId,
                ...(isMaterial && { returnDate: new Date() }),
              },
            })
          }
        }
      }

      await tx.request.update({
        where: { id: params.id },
        data: { status, adminNotes: adminNotes || null },
      })
    })

    await logAudit(
      admin.id, 'REVIEW_REQUEST', 'Request', params.id,
      `${admin.name} ${status} request from ${request.requester.name}`,
      admin.organizationId
    )

    const statusLabel = { APPROVED: 'approved', PARTIALLY_APPROVED: 'partially approved', REJECTED: 'rejected' }[status] || status
    await notifyUser(
      request.requesterId,
      admin.organizationId,
      'REQUEST_REVIEWED',
      `Request ${statusLabel}`,
      `Your tool request has been ${statusLabel}${adminNotes ? `: "${adminNotes}"` : '.'}`,
      `/requests/${params.id}`
    )

    if (stockWarnings.length > 0) {
      await notifyAdmins(
        admin.organizationId,
        'STOCK_NEGATIVE',
        '⚠️ Stock Replenishment Needed',
        stockWarnings.join(' | '),
        '/reports'
      )
    }

    const updated = await db.request.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        project: true,
        items: { include: { tool: { select: { id: true, name: true, currentStock: true } } } },
      },
    })

    let emailError: string | null = null

    // Send delivery note to both the requester and the admin who confirmed — only when something was approved
    if (status !== 'REJECTED' && updated) {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        emailError = 'SMTP_USER or SMTP_PASS not configured on this server'
      } else {
        const deliveryRecipients = Array.from(new Set([
          updated.requester.email,
          admin.email,
        ].filter(Boolean) as string[]))

        const noteItems = items.map((i: any) => {
          const original = request.items.find((ri) => ri.id === i.requestItemId)
          const name = original?.tool?.name || original?.itemName || 'Unknown item'
          return { name, requestedQty: original?.requestedQty ?? 0, approvedQty: parseInt(i.approvedQty) || 0 }
        })

        try {
          await sendDeliveryNoteEmail(deliveryRecipients, {
            requestId: params.id,
            requesterName: request.requester.name,
            confirmedByName: admin.name as string,
            projectName: updated.project?.name || null,
            status,
            confirmedAt: new Date(),
            items: noteItems,
            adminNotes: adminNotes || null,
          })
        } catch (e: any) {
          emailError = e.message
          console.error('Delivery note email failed:', e)
        }
      }
    }

    return NextResponse.json({ request: updated, stockWarnings, emailError })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError(e.message)
  }
}
