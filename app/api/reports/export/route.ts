export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, unauthorized, serverError } from '@/lib/utils'
import ExcelJS from 'exceljs'

// Palette
const C = {
  navyBg:   '1E3A5F',
  navyText: 'FFFFFF',
  blueBg:   '2563EB',
  blueText: 'FFFFFF',
  headBg:   'DBEAFE',
  headText: '1E40AF',
  altRow:   'F0F7FF',
  white:    'FFFFFF',
  greenBg:  'DCFCE7',
  greenFg:  '15803D',
  amberBg:  'FEF3C7',
  amberFg:  'B45309',
  redBg:    'FEE2E2',
  redFg:    'B91C1C',
  grayBg:   'F3F4F6',
  grayFg:   '6B7280',
  border:   'CBD5E1',
}

type Fill = ExcelJS.Fill
type Alignment = Partial<ExcelJS.Alignment>

function fill(hex: string): Fill { return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } } }
function border(): Partial<ExcelJS.Borders> {
  const s = { style: 'thin' as const, color: { argb: 'FF' + C.border } }
  return { top: s, bottom: s, left: s, right: s }
}
const centre: Alignment = { horizontal: 'center', vertical: 'middle' }
const left: Alignment   = { horizontal: 'left',   vertical: 'middle', wrapText: true }

function titleRow(ws: ExcelJS.Worksheet, text: string, cols: number, row: number) {
  ws.mergeCells(row, 1, row, cols)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.fill = fill(C.navyBg)
  cell.font = { bold: true, size: 15, color: { argb: 'FF' + C.navyText }, name: 'Calibri' }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(row).height = 36
}

function subheader(ws: ExcelJS.Worksheet, text: string, cols: number, row: number) {
  ws.mergeCells(row, 1, row, cols)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.fill = fill(C.headBg)
  cell.font = { bold: true, size: 11, color: { argb: 'FF' + C.headText }, name: 'Calibri' }
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
  ws.getRow(row).height = 22
}

function headerRow(ws: ExcelJS.Worksheet, headers: string[], rowNum: number) {
  const row = ws.getRow(rowNum)
  row.height = 22
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1)
    cell.value = h
    cell.fill = fill(C.blueBg)
    cell.font = { bold: true, size: 10, color: { argb: 'FF' + C.blueText }, name: 'Calibri' }
    cell.alignment = centre
    cell.border = border()
  })
}

function dataRow(ws: ExcelJS.Worksheet, values: (string | number | null)[], rowNum: number, alt = false, custom: Record<number, { fill?: string; font?: Partial<ExcelJS.Font> }> = {}) {
  const row = ws.getRow(rowNum)
  row.height = 18
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1)
    cell.value = v ?? ''
    cell.fill = fill(custom[i]?.fill ?? (alt ? C.altRow : C.white))
    cell.font = { size: 10, name: 'Calibri', ...custom[i]?.font }
    cell.alignment = left
    cell.border = border()
  })
}

function statusFill(status: string): string {
  if (status === 'RETURNED' || status === 'APPROVED' || status === 'OK') return C.greenBg
  if (status === 'ACTIVE' || status === 'PENDING' || status === 'Nizka zaloga') return C.amberBg
  if (status === 'Ni na zalogi' || status === 'REJECTED') return C.redBg
  return C.grayBg
}

function formatDT(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatD(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function hrs(mins: number | null | undefined): string {
  if (!mins) return '-'
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Route
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    const orgId = user.organizationId

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const [year, mon] = month.split('-').map(Number)
    const from = new Date(year, mon - 1, 1)
    const to   = new Date(year, mon, 0, 23, 59, 59)
    const monthLabel = from.toLocaleString('sl-SI', { month: 'long', year: 'numeric' })
    const generated  = new Date().toLocaleString('sl-SI', { dateStyle: 'full', timeStyle: 'short' })

    // Fetch all data
    const [checkouts, requests, tools, auditLogs] = await Promise.all([
      db.checkout.findMany({
        where: { organizationId: orgId, checkoutDate: { gte: from, lte: to } },
        include: {
          tool:    { select: { name: true, category: true } },
          user:    { select: { name: true, email: true, role: true } },
          project: { select: { name: true, location: true } },
        },
        orderBy: { checkoutDate: 'asc' },
      }),
      db.request.findMany({
        where: { organizationId: orgId, createdAt: { gte: from, lte: to } },
        include: {
          requester: { select: { name: true, email: true, role: true } },
          project:   { select: { name: true, location: true } },
          items:     { include: { tool: { select: { name: true, category: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.tool.findMany({ where: { active: true, organizationId: orgId }, orderBy: { name: 'asc' } }),
      db.auditLog.findMany({
        where: { organizationId: orgId, createdAt: { gte: from, lte: to } },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ])

    const returned   = checkouts.filter(c => c.status === 'RETURNED')
    const activeOuts = checkouts.filter(c => c.status === 'ACTIVE')

    // Aggregate stats - per user
    const userMap: Record<string, { name: string; email: string; role: string; checkouts: number; returned: number; active: number; totalMins: number; tools: Set<string> }> = {}
    for (const c of checkouts) {
      const k = c.userId
      if (!userMap[k]) userMap[k] = { name: c.user.name, email: c.user.email, role: c.user.role, checkouts: 0, returned: 0, active: 0, totalMins: 0, tools: new Set() }
      userMap[k].checkouts++
      userMap[k].totalMins += c.durationMins || 0
      userMap[k].tools.add(c.tool.name)
      if (c.status === 'RETURNED') userMap[k].returned++
      else userMap[k].active++
    }

    // per tool
    const toolMap: Record<string, { name: string; category: string; checkouts: number; totalMins: number; requests: number }> = {}
    for (const c of checkouts) {
      const k = c.toolId
      if (!toolMap[k]) toolMap[k] = { name: c.tool.name, category: c.tool.category || '', checkouts: 0, totalMins: 0, requests: 0 }
      toolMap[k].checkouts++
      toolMap[k].totalMins += c.durationMins || 0
    }
    for (const r of requests) {
      for (const item of r.items) {
        if (!item.tool || !item.toolId) continue
        const k = item.toolId
        if (!toolMap[k]) toolMap[k] = { name: item.tool.name, category: item.tool.category || '', checkouts: 0, totalMins: 0, requests: 0 }
        toolMap[k].requests++
      }
    }

    // per project
    const projMap: Record<string, { name: string; location: string; checkouts: number; totalMins: number; tools: Map<string, { name: string; qty: number; hrs: number }> }> = {}
    for (const c of checkouts) {
      if (!c.project) continue
      const k = c.projectId!
      if (!projMap[k]) projMap[k] = { name: c.project.name, location: c.project.location || '', checkouts: 0, totalMins: 0, tools: new Map() }
      projMap[k].checkouts++
      projMap[k].totalMins += c.durationMins || 0
      const tkey = c.tool.name
      const existing = projMap[k].tools.get(tkey)
      if (existing) { existing.qty++; existing.hrs += (c.durationMins || 0) / 60 }
      else projMap[k].tools.set(tkey, { name: tkey, qty: 1, hrs: (c.durationMins || 0) / 60 })
    }

    // per requester
    const reqUserMap: Record<string, {
      name: string; email: string; requests: number
      approved: number; rejected: number; pending: number; items: number
      tools: Map<string, { name: string; requested: number; approved: number }>
    }> = {}
    for (const r of requests) {
      const k = r.requesterId
      if (!reqUserMap[k]) reqUserMap[k] = { name: r.requester.name, email: r.requester.email, requests: 0, approved: 0, rejected: 0, pending: 0, items: 0, tools: new Map() }
      reqUserMap[k].requests++
      reqUserMap[k].items += r.items.length
      if (r.status === 'APPROVED' || r.status === 'PARTIALLY_APPROVED') reqUserMap[k].approved++
      else if (r.status === 'REJECTED') reqUserMap[k].rejected++
      else reqUserMap[k].pending++
      for (const item of r.items) {
        const tname = item.tool?.name || item.itemName || 'Postavka po meri'
        const existing = reqUserMap[k].tools.get(tname)
        if (existing) {
          existing.requested += item.requestedQty
          existing.approved  += item.approvedQty ?? 0
        } else {
          reqUserMap[k].tools.set(tname, { name: tname, requested: item.requestedQty, approved: item.approvedQty ?? 0 })
        }
      }
    }

    // Build workbook
    const wb = new ExcelJS.Workbook()
    wb.creator  = 'BuildFlow'
    wb.lastModifiedBy = 'BuildFlow'
    wb.created  = new Date()
    wb.modified = new Date()

    // SHEET 1 - Povzetek
    const ws1 = wb.addWorksheet('Povzetek', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws1.columns = [{ width: 34 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }]

    titleRow(ws1, `BuildFlow – Mesecno porocilo  |  ${monthLabel}`, 5, 1)
    ws1.getRow(2).height = 16
    ws1.getCell('A2').value = `Generirano: ${generated}`
    ws1.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF' + C.grayFg } }

    ws1.getRow(3).height = 12

    subheader(ws1, 'KLJUCNE METRIKE', 5, 4)
    headerRow(ws1, ['Metrika', 'Vrednost', '', '', ''], 5)
    const metrics: [string, string | number][] = [
      ['Skupaj izposoj ta mesec', checkouts.length],
      ['  – Vrnjeno', returned.length],
      ['  – Se zunaj (aktivno)', activeOuts.length],
      ['Rezervacije orodij', requests.length],
      ['Razlicnih orodij uporabljenih', new Set(checkouts.map(c => c.toolId)).size],
      ['Aktivnih zaposlenih', new Set(checkouts.map(c => c.userId)).size],
      ['Vkljucenih projektov', new Set(checkouts.filter(c => c.projectId).map(c => c.projectId)).size],
      ['Povprecno trajanje izposoje', returned.length ? hrs(Math.round(returned.reduce((s, c) => s + (c.durationMins || 0), 0) / returned.length)) : '-'],
      ['Skupaj ur uporabe orodij', hrs(returned.reduce((s, c) => s + (c.durationMins || 0), 0))],
      ['Orodij brez zaloge (zdaj)', tools.filter(t => t.currentStock === 0).length],
      ['Orodij z nizko zalogo (zdaj)', tools.filter(t => t.currentStock > 0 && t.currentStock <= t.minStock).length],
    ]
    metrics.forEach(([label, val], i) => {
      const r = 6 + i
      dataRow(ws1, [label, val, '', '', ''], r, i % 2 === 0)
      ws1.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' }
      ws1.getCell(r, 2).font = { bold: true, size: 11, color: { argb: 'FF1E3A5F' } }
    })

    ws1.getRow(6 + metrics.length).height = 12

    subheader(ws1, 'TOP 5 NAJPOGOSTEJSIH ORODIJ', 5, 6 + metrics.length + 1)
    headerRow(ws1, ['Orodje', 'Kategorija', 'Izposoje', 'Skupaj ur', 'Rezervacije'], 6 + metrics.length + 2)
    Object.values(toolMap)
      .sort((a, b) => b.checkouts - a.checkouts)
      .slice(0, 5)
      .forEach((t, i) => {
        dataRow(ws1, [t.name, t.category, t.checkouts, hrs(t.totalMins), t.requests], 6 + metrics.length + 3 + i, i % 2 === 0)
        ;[3, 4, 5].forEach(col => { ws1.getRow(6 + metrics.length + 3 + i).getCell(col).alignment = centre })
      })

    const topUserStart = 6 + metrics.length + 9
    subheader(ws1, 'TOP 5 NAJAKTIVNEJSIH ZAPOSLENIH', 5, topUserStart)
    headerRow(ws1, ['Ime', 'E-posta', 'Izposoje', 'Vrnjeno', 'Ure'], topUserStart + 1)
    Object.values(userMap)
      .sort((a, b) => b.checkouts - a.checkouts)
      .slice(0, 5)
      .forEach((u, i) => {
        dataRow(ws1, [u.name, u.email, u.checkouts, u.returned, hrs(u.totalMins)], topUserStart + 2 + i, i % 2 === 0)
        ;[3, 4, 5].forEach(col => { ws1.getRow(topUserStart + 2 + i).getCell(col).alignment = centre })
      })

    // SHEET 2 - Izposoje
    const ws2 = wb.addWorksheet('Izposoje', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws2.columns = [
      { width: 28 }, { width: 16 }, { width: 22 }, { width: 24 }, { width: 18 },
      { width: 18 }, { width: 14 }, { width: 10 }, { width: 16 },
    ]
    titleRow(ws2, `Izposoje – ${monthLabel}  (skupaj: ${checkouts.length})`, 9, 1)
    headerRow(ws2, ['Orodje', 'Kategorija', 'Zaposleni', 'E-posta', 'Projekt', 'Datum izposoje', 'Vrnjeno', 'Trajanje', 'Status'], 2)
    checkouts.forEach((c, i) => {
      const st = c.status
      const sfill = st === 'RETURNED' ? C.greenBg : C.amberBg
      const sfont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FF' + (st === 'RETURNED' ? C.greenFg : C.amberFg) } }
      dataRow(ws2, [
        c.tool.name, c.tool.category || '', c.user.name, c.user.email,
        c.project?.name || '-', formatDT(c.checkoutDate), c.returnDate ? formatDT(c.returnDate) : '-',
        hrs(c.durationMins), st,
      ], i + 3, i % 2 === 0, { 8: { fill: sfill, font: sfont } })
      ws2.getRow(i + 3).getCell(9).alignment = centre
    })

    // SHEET 3 - Aktivnost
    const ws3 = wb.addWorksheet('Aktivnost', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws3.columns = [{ width: 24 }, { width: 28 }, { width: 14 }, { width: 13 }, { width: 13 }, { width: 12 }, { width: 14 }, { width: 50 }]
    titleRow(ws3, `Aktivnost zaposlenih – ${monthLabel}`, 8, 1)
    headerRow(ws3, ['Ime', 'E-posta', 'Vloga', 'Izposoje', 'Vrnjeno', 'Se zunaj', 'Ure', 'Uporabljena orodja'], 2)
    Object.values(userMap)
      .sort((a, b) => b.checkouts - a.checkouts)
      .forEach((u, i) => {
        dataRow(ws3, [
          u.name, u.email, u.role, u.checkouts, u.returned, u.active, hrs(u.totalMins),
          Array.from(u.tools).join(', '),
        ], i + 3, i % 2 === 0)
        ;[4, 5, 6, 7].forEach(col => { ws3.getRow(i + 3).getCell(col).alignment = centre })
      })

    // SHEET 4 - Orodja
    const ws4 = wb.addWorksheet('Orodja', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws4.columns = [{ width: 28 }, { width: 18 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 14 }]
    titleRow(ws4, `Uporaba orodij – ${monthLabel}`, 8, 1)
    headerRow(ws4, ['Orodje', 'Kategorija', 'Izposoje', 'Skupaj ur', 'Rezervacije', 'Na zalogi', 'Skupaj', 'Status'], 2)
    const toolStock: Record<string, { currentStock: number; totalStock: number; minStock: number }> = {}
    tools.forEach(t => { toolStock[t.name] = { currentStock: t.currentStock, totalStock: t.totalStock, minStock: t.minStock } })
    Object.values(toolMap)
      .sort((a, b) => b.checkouts - a.checkouts)
      .forEach((t, i) => {
        const stock = toolStock[t.name]
        const st = !stock ? '' : stock.currentStock === 0 ? 'Ni na zalogi' : stock.currentStock <= stock.minStock ? 'Nizka zaloga' : 'OK'
        const sfill = statusFill(st)
        dataRow(ws4, [
          t.name, t.category, t.checkouts, hrs(t.totalMins), t.requests,
          stock?.currentStock ?? '-', stock?.totalStock ?? '-', st,
        ], i + 3, i % 2 === 0, { 7: { fill: sfill } })
        ;[3, 4, 5, 6, 7].forEach(col => { ws4.getRow(i + 3).getCell(col).alignment = centre })
      })

    // SHEET 5 - Projekti
    const ws5 = wb.addWorksheet('Projekti', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws5.columns = [{ width: 28 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 28 }, { width: 14 }, { width: 14 }]
    titleRow(ws5, `Projekti in uporabljena orodja – ${monthLabel}`, 7, 1)
    headerRow(ws5, ['Projekt', 'Lokacija', 'Izposoje', 'Skupaj ur', 'Orodje / Material', 'Krat', 'Ure'], 2)
    let projRow = 3
    Object.values(projMap)
      .sort((a, b) => b.checkouts - a.checkouts)
      .forEach((p, pi) => {
        const toolList = Array.from(p.tools.values()).sort((a, b) => b.qty - a.qty)
        const rowCount = Math.max(toolList.length, 1)
        const alt = pi % 2 === 0

        const first = toolList[0]
        dataRow(ws5, [
          p.name, p.location, p.checkouts, hrs(p.totalMins),
          first?.name ?? '-', first?.qty ?? '', first ? first.hrs.toFixed(1) + 'h' : '',
        ], projRow, alt)
        ws5.getRow(projRow).getCell(1).font = { bold: true, size: 10, name: 'Calibri' }
        ;[3, 4, 6, 7].forEach(col => { ws5.getRow(projRow).getCell(col).alignment = centre })

        toolList.slice(1).forEach((t, ti) => {
          dataRow(ws5, ['', '', '', '', t.name, t.qty, t.hrs.toFixed(1) + 'h'], projRow + 1 + ti, alt)
          ;[6, 7].forEach(col => { ws5.getRow(projRow + 1 + ti).getCell(col).alignment = centre })
        })

        if (rowCount > 1) {
          [1, 2, 3, 4].forEach(col => {
            ws5.mergeCells(projRow, col, projRow + rowCount - 1, col)
            ws5.getCell(projRow, col).alignment = { vertical: 'top', horizontal: col <= 2 ? 'left' : 'center', wrapText: true }
          })
        }

        projRow += rowCount
      })

    // SHEET 6 - Rezervacije
    const ws6 = wb.addWorksheet('Rezervacije', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws6.columns = [{ width: 22 }, { width: 26 }, { width: 24 }, { width: 18 }, { width: 28 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 32 }]
    titleRow(ws6, `Rezervacije – ${monthLabel}  (skupaj: ${requests.length})`, 9, 1)
    headerRow(ws6, ['Zahteval', 'E-posta', 'Projekt', 'Datum', 'Orodje / Material', 'Zahtevano', 'Odobreno', 'Status', 'Opombe'], 2)
    let reqRow = 3
    requests.forEach((r, ri) => {
      const alt = ri % 2 === 0
      r.items.forEach((item, ii) => {
        const sfill = statusFill(r.status)
        dataRow(ws6, [
          ii === 0 ? r.requester.name : '',
          ii === 0 ? r.requester.email : '',
          ii === 0 ? (r.project?.name ?? '-') : '',
          ii === 0 ? formatD(r.createdAt) : '',
          item.tool?.name || (item.itemName ? `${item.itemName} (ni v inventarju)` : '-'),
          item.requestedQty,
          item.approvedQty ?? '-',
          ii === 0 ? r.status : '',
          ii === 0 ? (r.notes ?? '') : (item.notes ?? ''),
        ], reqRow, alt, { 7: { fill: ii === 0 ? sfill : (alt ? C.altRow : C.white) } })
        ;[6, 7, 8].forEach(col => { ws6.getRow(reqRow).getCell(col).alignment = centre })
        reqRow++
      })
      if (r.items.length === 0) {
        dataRow(ws6, [r.requester.name, r.requester.email, r.project?.name ?? '-', formatD(r.createdAt), '(ni postavk)', '', '', r.status, r.notes ?? ''], reqRow, alt, { 7: { fill: statusFill(r.status) } })
        reqRow++
      }
    })

    // SHEET 7 - Rezervacije po osebi
    const ws7 = wb.addWorksheet('Rezervacije po osebi', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws7.columns = [{ width: 24 }, { width: 28 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 30 }, { width: 14 }, { width: 14 }]
    titleRow(ws7, `Rezervacije po osebi – ${monthLabel}`, 8, 1)
    headerRow(ws7, ['Ime', 'E-posta', 'Zahtevki', 'Odobreno', 'Zavrnjeno / V obdelavi', 'Orodje / Material', 'Zahtevano', 'Odobreno'], 2)

    let ws7Row = 3
    Object.values(reqUserMap)
      .sort((a, b) => b.requests - a.requests)
      .forEach((u, pi) => {
        const toolList = Array.from(u.tools.values()).sort((a, b) => b.requested - a.requested)
        const rowCount = Math.max(toolList.length, 1)
        const alt = pi % 2 === 0

        const rejPend = [u.rejected > 0 ? `${u.rejected} zavrnjenih` : '', u.pending > 0 ? `${u.pending} v obdelavi` : ''].filter(Boolean).join(', ') || '-'

        toolList.forEach((t, ti) => {
          dataRow(ws7, [
            ti === 0 ? u.name : '',
            ti === 0 ? u.email : '',
            ti === 0 ? u.requests : '',
            ti === 0 ? u.approved : '',
            ti === 0 ? rejPend : '',
            t.name,
            t.requested,
            t.approved || '-',
          ], ws7Row + ti, alt)
          ;[3, 4, 7, 8].forEach(col => { ws7.getRow(ws7Row + ti).getCell(col).alignment = centre })
        })

        if (toolList.length === 0) {
          dataRow(ws7, [u.name, u.email, u.requests, u.approved, rejPend, '(ni postavk)', '', ''], ws7Row, alt)
          ;[3, 4, 5].forEach(col => { ws7.getRow(ws7Row).getCell(col).alignment = centre })
        }

        const summaryRow = ws7.getRow(ws7Row)
        if (u.approved > 0) { summaryRow.getCell(4).fill = fill(C.greenBg); summaryRow.getCell(4).font = { bold: true, size: 10, color: { argb: 'FF' + C.greenFg } } }
        if (u.rejected > 0 || u.pending > 0) { summaryRow.getCell(5).fill = fill(C.amberBg); summaryRow.getCell(5).font = { bold: true, size: 10, color: { argb: 'FF' + C.amberFg } } }

        if (rowCount > 1) {
          [1, 2, 3, 4, 5].forEach(col => {
            ws7.mergeCells(ws7Row, col, ws7Row + rowCount - 1, col)
            ws7.getCell(ws7Row, col).alignment = { vertical: 'top', horizontal: col <= 2 ? 'left' : 'center', wrapText: true }
          })
        }

        ws7Row += rowCount
      })

    // SHEET 8 - Inventar
    const ws8 = wb.addWorksheet('Inventar', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws8.columns = [{ width: 30 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }]
    titleRow(ws8, `Stanje zalog – ${monthLabel}`, 7, 1)
    headerRow(ws8, ['Orodje', 'Kategorija', 'Na zalogi', 'Skupaj', 'Min. zaloga', 'Maks. zaloga', 'Status'], 2)
    tools.forEach((t, i) => {
      const st = t.currentStock === 0 ? 'Ni na zalogi' : t.currentStock <= t.minStock ? 'Nizka zaloga' : 'OK'
      dataRow(ws8, [t.name, t.category || '', t.currentStock, t.totalStock, t.minStock, t.maxStock, st], i + 3, i % 2 === 0, { 6: { fill: statusFill(st) } })
      ;[3, 4, 5, 6, 7].forEach(col => { ws8.getRow(i + 3).getCell(col).alignment = centre })
    })

    // SHEET 9 - Revizijska sled
    const ws9 = wb.addWorksheet('Revizijska sled', { views: [{ state: 'frozen', ySplit: 2 }] })
    ws9.columns = [{ width: 20 }, { width: 22 }, { width: 28 }, { width: 18 }, { width: 60 }]
    titleRow(ws9, `Revizijska sled – ${monthLabel}  (${auditLogs.length} vnosov)`, 5, 1)
    headerRow(ws9, ['Datum in cas', 'Uporabnik', 'E-posta', 'Dejanje', 'Podrobnosti'], 2)
    auditLogs.forEach((l, i) => {
      dataRow(ws9, [formatDT(l.createdAt), l.user?.name ?? 'Sistem', l.user?.email ?? '', l.action, l.details ?? ''], i + 3, i % 2 === 0)
    })

    // Write & respond
    const buf = await wb.xlsx.writeBuffer()
    const filename = `BuildFlow_Porocilo_${month}.xlsx`

    return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    console.error('Export error:', e)
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return serverError()
  }
}
