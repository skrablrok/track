import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

// Returns the tool/material list from a project's "starting kit" — the first request
// that cleared approval for that project — so a new request for another project can
// copy it in one click instead of re-selecting everything by hand.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()

    const kitRequest = await db.request.findFirst({
      where: { projectId: params.id, isStartingKit: true, organizationId: user.organizationId },
      include: {
        items: {
          include: {
            tool: { select: { id: true, name: true, type: true, imageUrl: true, category: true, currentStock: true, totalStock: true, minStock: true } },
          },
        },
      },
    })

    if (!kitRequest) return NextResponse.json({ items: [] })

    // Serials actually used last time, per tool, so re-approving the copy can try to
    // hand back the same physical unit — matched by toolId since a request never has
    // two items for the same tool.
    const checkouts = await db.checkout.findMany({
      where: { requestId: kitRequest.id, organizationId: user.organizationId },
      include: { serialAssignments: { include: { unit: { select: { serialNumber: true } } } } },
    })
    const serialsByToolId = new Map<string, string[]>()
    for (const co of checkouts) {
      const serials = co.serialAssignments.map((a) => a.unit.serialNumber)
      if (serials.length) serialsByToolId.set(co.toolId, [...(serialsByToolId.get(co.toolId) || []), ...serials])
    }

    const items = kitRequest.items
      .filter((i) => i.toolId && i.tool && (i.approvedQty ?? 0) > 0)
      .map((i) => ({
        toolId: i.toolId as string,
        name: i.tool!.name,
        type: i.tool!.type,
        imageUrl: i.tool!.imageUrl,
        category: i.tool!.category,
        currentStock: i.tool!.currentStock,
        totalStock: i.tool!.totalStock,
        minStock: i.tool!.minStock,
        requestedQty: i.approvedQty ?? i.requestedQty,
        preferredSerials: serialsByToolId.get(i.toolId as string) || [],
      }))

    return NextResponse.json({ items })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
