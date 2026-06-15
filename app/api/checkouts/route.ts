import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAudit, unauthorized, serverError, badRequest } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const toolId = searchParams.get('toolId')
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(user.role as string)

    const checkouts = await db.checkout.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(toolId && { toolId }),
        ...(projectId && { projectId }),
        ...(!isAdminOrManager && { userId: user.id }),
        ...(isAdminOrManager && userId && { userId }),
        ...(from && { checkoutDate: { gte: new Date(from) } }),
        ...(to && { checkoutDate: { lte: new Date(to) } }),
      },
      include: {
        tool: { select: { id: true, name: true, imageUrl: true, category: true } },
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, location: true } },
      },
      orderBy: { checkoutDate: 'desc' },
    })

    return NextResponse.json(checkouts)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { toolId, projectId, quantity, notes } = body

    if (!toolId) return badRequest('Tool ID is required')

    const qty = parseInt(quantity) || 1

    const tool = await db.tool.findUnique({ where: { id: toolId } })
    if (!tool || !tool.active) return badRequest('Tool not found or inactive')
    if (tool.currentStock < qty) return badRequest(`Insufficient stock. Available: ${tool.currentStock}`)

    const [checkout] = await db.$transaction([
      db.checkout.create({
        data: {
          toolId,
          userId: user.id,
          projectId: projectId || null,
          quantity: qty,
          notes,
          status: 'ACTIVE',
        },
        include: {
          tool: true,
          user: { select: { id: true, name: true, email: true } },
          project: true,
        },
      }),
      db.tool.update({
        where: { id: toolId },
        data: { currentStock: { decrement: qty } },
      }),
    ])

    await logAudit(
      user.id,
      'CHECKOUT',
      'Checkout',
      checkout.id,
      `${user.name} checked out ${qty}x ${tool.name}`
    )

    return NextResponse.json(checkout, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
