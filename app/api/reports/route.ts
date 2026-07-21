import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'overview'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const orgId = user.organizationId

    const dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    }

    if (type === 'overview') {
      const [toolCount, materialCount, lowStockTools, activeCheckouts, totalCheckouts] =
        await Promise.all([
          db.tool.count({ where: { active: true, type: 'TOOL', organizationId: orgId } }),
          db.tool.count({ where: { active: true, type: 'MATERIAL', organizationId: orgId } }),
          db.tool.findMany({
            where: { active: true, organizationId: orgId },
            select: { id: true, name: true, currentStock: true, minStock: true, totalStock: true, category: true },
          }).then(tools => tools.filter(t => t.currentStock <= t.minStock)),
          db.checkout.count({ where: { status: 'ACTIVE', organizationId: orgId } }),
          db.checkout.count({
            where: { organizationId: orgId, ...(Object.keys(dateFilter).length && { checkoutDate: dateFilter }) },
          }),
        ])

      return NextResponse.json({ toolCount, materialCount, lowStockTools, activeCheckouts, totalCheckouts })
    }

    if (type === 'usage') {
      const checkouts = await db.checkout.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['RETURNED', 'CONSUMED'] },
          ...(Object.keys(dateFilter).length && { checkoutDate: dateFilter }),
        },
        include: {
          tool: { select: { id: true, name: true, category: true } },
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { checkoutDate: 'desc' },
      })

      const byTool = checkouts.reduce((acc: any, c) => {
        const key = c.tool.name
        if (!acc[key]) acc[key] = { name: key, count: 0, totalMins: 0 }
        acc[key].count++
        acc[key].totalMins += c.durationMins || 0
        return acc
      }, {})

      const byUser = checkouts.reduce((acc: any, c) => {
        const key = c.user.name
        if (!acc[key]) acc[key] = { name: key, count: 0 }
        acc[key].count++
        return acc
      }, {})

      const byProject = checkouts.reduce((acc: any, c) => {
        if (!c.project) return acc
        const key = c.project.name
        if (!acc[key]) acc[key] = { name: key, count: 0 }
        acc[key].count++
        return acc
      }, {})

      return NextResponse.json({
        byTool: Object.values(byTool).sort((a: any, b: any) => b.count - a.count),
        byUser: Object.values(byUser).sort((a: any, b: any) => b.count - a.count),
        byProject: Object.values(byProject).sort((a: any, b: any) => b.count - a.count),
        checkouts,
      })
    }

    if (type === 'inventory') {
      const tools = await db.tool.findMany({
        where: { active: true, organizationId: orgId },
        select: { id: true, name: true, category: true, totalStock: true, currentStock: true, minStock: true, maxStock: true },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json(tools)
    }

    if (type === 'audit') {
      const logs = await db.auditLog.findMany({
        where: { organizationId: orgId, ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return NextResponse.json(logs)
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
