import ExcelJS from 'exceljs'

// Palette
export const C = {
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

export function fill(hex: string): Fill { return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } } }
export function border(): Partial<ExcelJS.Borders> {
  const s = { style: 'thin' as const, color: { argb: 'FF' + C.border } }
  return { top: s, bottom: s, left: s, right: s }
}
export const centre: Alignment = { horizontal: 'center', vertical: 'middle' }
export const left: Alignment   = { horizontal: 'left',   vertical: 'middle', wrapText: true }

export function titleRow(ws: ExcelJS.Worksheet, text: string, cols: number, row: number) {
  ws.mergeCells(row, 1, row, cols)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.fill = fill(C.navyBg)
  cell.font = { bold: true, size: 15, color: { argb: 'FF' + C.navyText }, name: 'Calibri' }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(row).height = 36
}

export function subheader(ws: ExcelJS.Worksheet, text: string, cols: number, row: number) {
  ws.mergeCells(row, 1, row, cols)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.fill = fill(C.headBg)
  cell.font = { bold: true, size: 11, color: { argb: 'FF' + C.headText }, name: 'Calibri' }
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
  ws.getRow(row).height = 22
}

export function headerRow(ws: ExcelJS.Worksheet, headers: string[], rowNum: number) {
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

export function dataRow(ws: ExcelJS.Worksheet, values: (string | number | null)[], rowNum: number, alt = false, custom: Record<number, { fill?: string; font?: Partial<ExcelJS.Font> }> = {}) {
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

export function statusFill(status: string): string {
  if (status === 'RETURNED' || status === 'APPROVED' || status === 'COMPLETED' || status === 'OK') return C.greenBg
  if (status === 'ACTIVE' || status === 'PENDING' || status === 'ORDERED' || status === 'Nizka zaloga') return C.amberBg
  if (status === 'Ni na zalogi' || status === 'REJECTED' || status === 'NOT_ON_RECEIPT') return C.redBg
  return C.grayBg
}

export function formatDT(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function formatD(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function hrs(mins: number | null | undefined): string {
  if (!mins) return '-'
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function newWorkbook() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'BuildFlow'
  wb.lastModifiedBy = 'BuildFlow'
  wb.created = new Date()
  wb.modified = new Date()
  return wb
}

export async function workbookResponse(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer()
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
