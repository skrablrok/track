import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'
import { titleRow, headerRow, dataRow, centre, formatDT, newWorkbook, workbookResponse } from '@/lib/excel-styles'

type ReceiptItem = { name: string; quantity: number; unitPrice: number; isMaterial?: boolean }

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()

    const purchase = await db.purchase.findFirst({
      where: { id: params.id, organizationId: user.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!purchase) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)
    if (!isPrivileged && purchase.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    const items = Array.isArray(purchase.items) ? (purchase.items as unknown as ReceiptItem[]) : []
    const generated = new Date().toLocaleString('sl-SI', { dateStyle: 'full', timeStyle: 'short' })

    const wb = newWorkbook()
    const ws = wb.addWorksheet('Racun', { views: [{ state: 'frozen', ySplit: 3 }] })
    ws.columns = [{ width: 30 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }]

    titleRow(ws, `BuildFlow – Racun`, 5, 1)
    ws.getRow(2).height = 16
    ws.getCell('A2').value = `${purchase.user.name} · ${formatDT(purchase.createdAt)}${purchase.note ? ' · ' + purchase.note : ''} · Generirano: ${generated}`
    ws.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }

    headerRow(ws, ['Postavka', 'Vrsta', 'Kolicina', 'Cena/kos', 'Skupaj'], 3)
    let row = 4
    items.forEach((it, i) => {
      const lineTotal = (it.quantity || 0) * (it.unitPrice || 0)
      dataRow(ws, [
        it.name,
        it.isMaterial === true ? 'Material' : it.isMaterial === false ? 'Orodje' : '-',
        it.quantity,
        it.unitPrice?.toFixed(2) + ' €',
        lineTotal.toFixed(2) + ' €',
      ], row, i % 2 === 0)
      ;[3, 4, 5].forEach((col) => { ws.getRow(row).getCell(col).alignment = centre })
      row++
    })

    if (typeof purchase.totalPrice === 'number') {
      row += 1
      dataRow(ws, ['', '', '', 'SKUPAJ', purchase.totalPrice.toFixed(2) + ' €'], row, false)
      ws.getRow(row).getCell(4).font = { bold: true, size: 11 }
      ws.getRow(row).getCell(5).font = { bold: true, size: 11 }
      ws.getRow(row).getCell(4).alignment = centre
      ws.getRow(row).getCell(5).alignment = centre
    }

    const filename = `BuildFlow_Racun_${purchase.id}.xlsx`
    return await workbookResponse(wb, filename)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
