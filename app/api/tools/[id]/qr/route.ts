import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'
import QRCode from 'qrcode'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const tool = await db.tool.findFirst({ where: { id: params.id, organizationId: user.organizationId } })
    if (!tool) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const qrDataUrl = await QRCode.toDataURL(tool.qrCode, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })

    return NextResponse.json({ qrCode: tool.qrCode, qrDataUrl })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError()
  }
}
