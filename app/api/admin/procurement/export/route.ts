import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, unauthorized, forbidden, serverError, badRequest } from '@/lib/utils'
import { titleRow, subheader, headerRow, dataRow, statusFill, centre, formatDT, newWorkbook, workbookResponse } from '@/lib/excel-styles'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PURCHASE: 'Caka nabavo',
  ORDERED: 'Naroceno',
  COMPLETED: 'Zakljuceno',
  NOT_ON_RECEIPT: 'Ni na racunu',
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'MANAGER'])
    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    const month = searchParams.get('month')

    if (!batchId && !month) return badRequest('batchId or month is required')

    const generated = new Date().toLocaleString('sl-SI', { dateStyle: 'full', timeStyle: 'short' })
    const wb = newWorkbook()

    if (batchId) {
      const items = await db.requestItem.findMany({
        where: { procurementBatchId: batchId, request: { organizationId: admin.organizationId } },
        include: {
          tool: { select: { name: true, type: true } },
          request: { include: { requester: { select: { name: true } }, project: { select: { name: true } } } },
          purchase: { select: { photoUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
      if (items.length === 0) return badRequest('Order not found')

      const deliverTo = items[0].deliverTo || '-'
      const orderedAt = items[0].orderedAt || items[0].procurementUpdatedAt

      const ws = wb.addWorksheet('Narocilo', { views: [{ state: 'frozen', ySplit: 3 }] })
      ws.columns = [{ width: 28 }, { width: 12 }, { width: 10 }, { width: 20 }, { width: 20 }, { width: 16 }, { width: 34 }]
      titleRow(ws, `BuildFlow – Narocilo`, 7, 1)
      ws.getRow(2).height = 16
      ws.getCell('A2').value = `Dostava: ${deliverTo} · Naroceno: ${formatDT(orderedAt)} · Generirano: ${generated}`
      ws.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }

      headerRow(ws, ['Postavka', 'Vrsta', 'Kolicina', 'Zahteval(a)', 'Projekt', 'Status', 'Racun'], 3)
      items.forEach((it, i) => {
        const name = it.tool?.name || it.itemName || 'Postavka'
        const type = it.tool ? (it.tool.type === 'MATERIAL' ? 'Material' : 'Orodje') : '-'
        const status = STATUS_LABEL[it.procurementStatus || ''] || it.procurementStatus || '-'
        dataRow(ws, [
          name, type, it.requestedQty, it.request.requester.name, it.request.project?.name || '-', status,
          it.purchase?.photoUrl ? 'Da' : '-',
        ], i + 4, i % 2 === 0, { 6: { fill: statusFill(it.procurementStatus || '') } })
        ;[3, 6, 7].forEach((col) => { ws.getRow(i + 4).getCell(col).alignment = centre })
        if (it.purchase?.photoUrl) {
          const cell = ws.getRow(i + 4).getCell(7)
          cell.value = { text: 'Odpri racun', hyperlink: it.purchase.photoUrl }
          cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF2563EB' }, underline: true }
        }
      })

      const filename = `BuildFlow_Narocilo_${batchId}.xlsx`
      return await workbookResponse(wb, filename)
    }

    // Monthly mode
    const [year, mon] = month!.split('-').map(Number)
    const from = new Date(year, mon - 1, 1)
    const to = new Date(year, mon, 0, 23, 59, 59)
    const monthLabel = from.toLocaleString('sl-SI', { month: 'long', year: 'numeric' })

    const items = await db.requestItem.findMany({
      where: {
        request: { organizationId: admin.organizationId },
        procurementStatus: 'COMPLETED',
        procurementUpdatedAt: { gte: from, lte: to },
      },
      include: {
        tool: { select: { name: true, type: true } },
        request: { include: { requester: { select: { name: true } }, project: { select: { name: true } } } },
      },
      orderBy: { procurementUpdatedAt: 'asc' },
    })

    const itemMap: Record<string, { name: string; isMaterial: boolean; qty: number; batches: Set<string> }> = {}
    for (const it of items) {
      const name = it.tool?.name || it.itemName || 'Postavka'
      const key = name.trim().toLowerCase()
      if (!itemMap[key]) itemMap[key] = { name, isMaterial: it.tool?.type === 'MATERIAL', qty: 0, batches: new Set() }
      itemMap[key].qty += it.requestedQty
      if (it.procurementBatchId) itemMap[key].batches.add(it.procurementBatchId)
    }

    const ws1 = wb.addWorksheet('Povzetek', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws1.columns = [{ width: 32 }, { width: 20 }, { width: 20 }]
    titleRow(ws1, `BuildFlow – Nabava  |  ${monthLabel}`, 3, 1)
    ws1.getRow(2).height = 16
    ws1.getCell('A2').value = `Zakljucenih postavk: ${items.length}  ·  Razlicnih artiklov: ${Object.keys(itemMap).length}  ·  Generirano: ${generated}`
    ws1.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }

    subheader(ws1, 'KOLICINE PO POSTAVKAH', 3, 4)
    headerRow(ws1, ['Postavka', 'Vrsta', 'Skupna kolicina'], 5)
    Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .forEach((it, i) => {
        dataRow(ws1, [it.name, it.isMaterial ? 'Material' : 'Orodje', it.qty], 6 + i, i % 2 === 0)
        ws1.getRow(6 + i).getCell(3).alignment = centre
      })

    const ws2 = wb.addWorksheet('Postavke', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws2.columns = [{ width: 28 }, { width: 12 }, { width: 10 }, { width: 20 }, { width: 20 }, { width: 16 }]
    titleRow(ws2, `Zakljucene postavke – ${monthLabel}  (skupaj: ${items.length})`, 6, 1)
    headerRow(ws2, ['Postavka', 'Vrsta', 'Kolicina', 'Zahteval(a)', 'Projekt', 'Zakljuceno'], 2)
    items.forEach((it, i) => {
      const name = it.tool?.name || it.itemName || 'Postavka'
      const type = it.tool ? (it.tool.type === 'MATERIAL' ? 'Material' : 'Orodje') : '-'
      dataRow(ws2, [
        name, type, it.requestedQty, it.request.requester.name, it.request.project?.name || '-',
        formatDT(it.procurementUpdatedAt),
      ], i + 3, i % 2 === 0)
      ws2.getRow(i + 3).getCell(3).alignment = centre
    })

    const filename = `BuildFlow_Nabava_${month}.xlsx`
    return await workbookResponse(wb, filename)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError(e.message)
  }
}
