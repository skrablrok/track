import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, logAudit, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'

type ToolRow = {
  name: string
  type: 'TOOL' | 'MATERIAL'
  category?: string
  quantity: number
  minStock?: number
  maxStock?: number
  description?: string
}

type ProjectRow = {
  name: string
  location?: string
  description?: string
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const body = await req.json()
    const tools: ToolRow[] = Array.isArray(body.tools) ? body.tools : []
    const projects: ProjectRow[] = Array.isArray(body.projects) ? body.projects : []

    if (tools.length === 0 && projects.length === 0) {
      return badRequest('Nothing to import')
    }

    const result = await db.$transaction(async (tx) => {
      const toolsSkipped: string[] = []
      let toolsCreated = 0
      for (const row of tools) {
        const name = String(row.name || '').trim()
        if (!name) continue
        const existing = await tx.tool.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
        if (existing) {
          toolsSkipped.push(name)
          continue
        }
        const quantity = Math.max(0, parseInt(String(row.quantity)) || 0)
        await tx.tool.create({
          data: {
            name,
            description: row.description || null,
            category: row.category || null,
            type: row.type === 'MATERIAL' ? 'MATERIAL' : 'TOOL',
            totalStock: quantity,
            currentStock: quantity,
            minStock: parseInt(String(row.minStock)) || 2,
            maxStock: parseInt(String(row.maxStock)) || 10,
          },
        })
        toolsCreated++
      }

      const projectsSkipped: string[] = []
      let projectsCreated = 0
      for (const row of projects) {
        const name = String(row.name || '').trim()
        if (!name) continue
        const existing = await tx.project.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
        if (existing) {
          projectsSkipped.push(name)
          continue
        }
        await tx.project.create({
          data: { name, location: row.location || null, description: row.description || null },
        })
        projectsCreated++
      }

      return { toolsCreated, toolsSkipped, projectsCreated, projectsSkipped }
    })

    await logAudit(
      user.id, 'BULK_IMPORT', 'Tool', undefined,
      `${user.name} imported ${result.toolsCreated} tool(s)/material(s) and ${result.projectsCreated} project(s) from Excel (${result.toolsSkipped.length} tool duplicate(s), ${result.projectsSkipped.length} project duplicate(s) skipped)`
    )

    return NextResponse.json({
      tools: { created: result.toolsCreated, skippedDuplicates: result.toolsSkipped },
      projects: { created: result.projectsCreated, skippedDuplicates: result.projectsSkipped },
    })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError(e.message)
  }
}
