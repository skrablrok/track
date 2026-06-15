import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 })

    const tool = await db.tool.findUnique({
      where: { qrCode: code },
      include: {
        checkouts: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, name: true } },
            project: true,
          },
        },
      },
    })

    if (!tool) return new Response(JSON.stringify({ error: 'Tool not found' }), { status: 404 })
    return NextResponse.json(tool)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
