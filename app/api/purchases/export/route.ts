import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, serverError } from '@/lib/utils'
import { titleRow, subheader, headerRow, dataRow, centre, formatDT, newWorkbook, workbookResponse } from '@/lib/excel-styles'

type ReceiptItem = { name: string; quantity: number; unitPrice: number; isMaterial?: boolean }

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(user.role as string)

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const [year, mon] = month.split('-').map(Number)
    const from = new Date(year, mon - 1, 1)
    const to = new Date(year, mon, 0, 23, 59, 59)
    const monthLabel = from.toLocaleString('sl-SI', { month: 'long', year: 'numeric' })
    const generated = new Date().toLocaleString('sl-SI', { dateStyle: 'full', timeStyle: 'short' })

    const purchases = await db.purchase.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: from, lte: to },
        ...(!isPrivileged && { userId: user.id }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    })

    // Aggregate items across every purchase this month
    const itemMap: Record<string, { name: string; isMaterial: boolean | null; qty: number; spent: number; purchases: Set<string> }> = {}
    for (const p of purchases) {
      const items = Array.isArray(p.items) ? (p.items as unknown as ReceiptItem[]) : []
      for (const it of items) {
        const key = it.name.trim().toLowerCase()
        if (!itemMap[key]) itemMap[key] = { name: it.name, isMaterial: it.isMaterial ?? null, qty: 0, spent: 0, purchases: new Set() }
        itemMap[key].qty += it.quantity || 0
        itemMap[key].spent += (it.quantity || 0) * (it.unitPrice || 0)
        itemMap[key].purchases.add(p.id)
      }
    }

    const totalSpent = purchases.reduce((s, p) => s + (p.totalPrice || 0), 0)

    const wb = newWorkbook()

    // SHEET 1 - Povzetek po postavkah
    const ws1 = wb.addWorksheet('Povzetek', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws1.columns = [{ width: 32 }, { width: 24 }, { width: 22 }, { width: 22 }]
    titleRow(ws1, `BuildFlow – Nakupi  |  ${monthLabel}`, 4, 1)
    ws1.getRow(2).height = 16
    ws1.getCell('A2').value = `Skupaj nakupov: ${purchases.length}  ·  Skupaj postavk: ${Object.keys(itemMap).length}  ·  Skupaj poraba: ${totalSpent.toFixed(2)} €  ·  Generirano: ${generated}`
    ws1.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }

    subheader(ws1, 'KOLICINE PO POSTAVKAH', 4, 4)
    headerRow(ws1, ['Postavka', 'Vrsta', 'Skupna kolicina', 'Skupna vrednost'], 5)
    Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .forEach((it, i) => {
        dataRow(ws1, [
          it.name,
          it.isMaterial === true ? 'Material' : it.isMaterial === false ? 'Orodje' : '-',
          it.qty,
          it.spent.toFixed(2) + ' €',
        ], 6 + i, i % 2 === 0)
        ;[3, 4].forEach((col) => { ws1.getRow(6 + i).getCell(col).alignment = centre })
      })

    // SHEET 2 - Nakupi (po racunu)
    const ws2 = wb.addWorksheet('Nakupi', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws2.columns = [{ width: 22 }, { width: 26 }, { width: 30 }, { width: 12 }, { width: 14 }]
    titleRow(ws2, `Nakupi – ${monthLabel}  (skupaj: ${purchases.length})`, 5, 1)
    headerRow(ws2, ['Datum', 'Kupil(a)', 'Opomba', 'Postavk', 'Skupaj'], 2)
    purchases.forEach((p, i) => {
      const items = Array.isArray(p.items) ? (p.items as unknown as ReceiptItem[]) : []
      dataRow(ws2, [
        formatDT(p.createdAt), p.user.name, p.note || '-', items.length,
        typeof p.totalPrice === 'number' ? p.totalPrice.toFixed(2) + ' €' : '-',
      ], i + 3, i % 2 === 0)
      ;[4, 5].forEach((col) => { ws2.getRow(i + 3).getCell(col).alignment = centre })
    })

    const filename = `BuildFlow_Nakupi_${month}.xlsx`
    return await workbookResponse(wb, filename)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    return serverError(e.message)
  }
}
