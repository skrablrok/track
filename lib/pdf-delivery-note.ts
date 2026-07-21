import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'

type Item = { name: string; requestedQty: number; approvedQty: number }

const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 50
const USABLE_W = PAGE_W - MARGIN * 2  // 495

function c([r, g, b]: number[]) { return rgb(r / 255, g / 255, b / 255) }

const COL = {
  darkBlue:  [30,  58,  95],
  white:     [255, 255, 255],
  gray700:   [55,  65,  81],
  gray600:   [100, 116, 139],
  gray400:   [148, 163, 184],
  gray200:   [226, 232, 240],
  gray50:    [248, 250, 252],
  dark:      [30,  41,  59],
  green:     [21,  128, 61],
  greenBg:   [220, 252, 231],
  amber:     [180, 83,  9],
  amberBg:   [254, 243, 199],
  amberNote: [146, 64,  14],
  amberText: [120, 53,  15],
  yellowBg:  [254, 252, 232],
  yellowBdr: [253, 230, 138],
}

// Fonts are loaded once per process and cached
let _fontRegular: Buffer | null = null
let _fontBold: Buffer | null = null

function getFontBytes() {
  if (!_fontRegular || !_fontBold) {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts')
    _fontRegular = fs.readFileSync(path.join(fontsDir, 'NotoSans-Regular.ttf'))
    _fontBold    = fs.readFileSync(path.join(fontsDir, 'NotoSans-Bold.ttf'))
  }
  return { regular: _fontRegular!, bold: _fontBold! }
}

export async function generateDeliveryNotePdf(details: {
  requestId: string
  requesterName: string
  confirmedByName: string
  projectName: string | null
  status: string
  confirmedAt: Date
  items: Item[]
  adminNotes?: string | null
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const { regular: regularBytes, bold: boldBytes } = getFontBytes()
  const regular = await pdfDoc.embedFont(regularBytes, { subset: true })
  const bold    = await pdfDoc.embedFont(boldBytes,    { subset: true })

  const page = pdfDoc.addPage([PAGE_W, PAGE_H])

  // pdf-lib origin is bottom-left; layout values use "from-top" — these helpers convert.
  const pdfY = (fromTop: number) => PAGE_H - fromTop

  function fillRect(x: number, yTop: number, w: number, h: number, col: number[]) {
    page.drawRectangle({ x, y: pdfY(yTop + h), width: w, height: h, color: c(col) })
  }

  function strokeRect(x: number, yTop: number, w: number, h: number, col: number[], lw = 0.5) {
    page.drawRectangle({ x, y: pdfY(yTop + h), width: w, height: h, borderColor: c(col), borderWidth: lw })
  }

  function drawText(str: string, x: number, yTop: number, size: number, font: typeof regular, col: number[], maxWidth?: number) {
    page.drawText(String(str), { x, y: pdfY(yTop + size * 0.78), size, font, color: c(col), maxWidth })
  }

  function drawTextRight(str: string, xRight: number, yTop: number, size: number, font: typeof regular, col: number[]) {
    const tw = font.widthOfTextAtSize(str, size)
    drawText(str, xRight - tw, yTop, size, font, col)
  }

  function drawTextCenter(str: string, boxX: number, boxW: number, yTop: number, size: number, font: typeof regular, col: number[]) {
    const tw = font.widthOfTextAtSize(str, size)
    drawText(str, boxX + (boxW - tw) / 2, yTop, size, font, col)
  }

  function hline(yTop: number, x1: number, x2: number, col: number[], lw = 0.5) {
    page.drawLine({ start: { x: x1, y: pdfY(yTop) }, end: { x: x2, y: pdfY(yTop) }, thickness: lw, color: c(col) })
  }

  function vline(x: number, yTop1: number, yTop2: number, col: number[], lw = 0.5) {
    page.drawLine({ start: { x, y: pdfY(yTop1) }, end: { x, y: pdfY(yTop2) }, thickness: lw, color: c(col) })
  }

  const { requestId, requesterName, confirmedByName, projectName, status, confirmedAt, items, adminNotes } = details
  const ref     = requestId.slice(-8).toUpperCase()
  const dateStr = confirmedAt.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = confirmedAt.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
  const statusLabel = status === 'APPROVED' ? 'POTRJENO' : 'DELNO POTRJENO'
  const statusCol   = status === 'APPROVED' ? COL.green   : COL.amber
  const statusBgCol = status === 'APPROVED' ? COL.greenBg : COL.amberBg

  // ── Header bar ──────────────────────────────────────────────────────────
  fillRect(MARGIN, 45, USABLE_W, 52, COL.darkBlue)
  drawText('BuildFlow', MARGIN + 12, 54, 18, bold, COL.white)
  drawText('Upravljanje inventarja orodij', MARGIN + 12, 74, 9, regular, COL.white)
  drawTextRight('DOBAVNICA', PAGE_W - MARGIN, 54, 22, bold, COL.white)
  drawTextRight('Delivery Note', PAGE_W - MARGIN, 74, 9, regular, COL.white)

  // ── Reference / date strip ───────────────────────────────────────────
  const stripY = 108
  drawText(`Ref: #${ref}`, MARGIN, stripY, 9, regular, COL.gray700)
  drawTextRight(`Datum: ${dateStr}  ob  ${timeStr}`, PAGE_W - MARGIN, stripY, 9, regular, COL.gray700)

  const badgeW = 110
  const badgeX = MARGIN + USABLE_W / 2 - badgeW / 2
  fillRect(badgeX, stripY - 3, badgeW, 16, statusBgCol)
  drawTextCenter(statusLabel, badgeX, badgeW, stripY + 1, 8, bold, statusCol)

  // ── Divider ─────────────────────────────────────────────────────────
  hline(130, MARGIN, PAGE_W - MARGIN, COL.gray200)

  // ── Parties ──────────────────────────────────────────────────────────
  const halfW = USABLE_W / 2 - 8
  const boxY  = 138

  fillRect(MARGIN, boxY, halfW, 64, COL.gray50)
  drawText('NAROČNIK', MARGIN + 8, boxY + 8, 7, bold, COL.gray400)
  drawText(requesterName, MARGIN + 8, boxY + 20, 11, bold, COL.dark)
  if (projectName) drawText(`Projekt: ${projectName}`, MARGIN + 8, boxY + 36, 9, regular, COL.gray600)

  const rightX = MARGIN + halfW + 16
  fillRect(rightX, boxY, halfW, 64, COL.gray50)
  drawText('POTRDIL', rightX + 8, boxY + 8, 7, bold, COL.gray400)
  drawText(confirmedByName, rightX + 8, boxY + 20, 11, bold, COL.dark)
  drawText(dateStr, rightX + 8, boxY + 36, 9, regular, COL.gray600)

  // ── Items table ──────────────────────────────────────────────────────
  const tableY  = boxY + 80
  const colName = MARGIN
  const colReq  = 390
  const colApp  = 465
  const colW60  = 60

  fillRect(MARGIN, tableY, USABLE_W, 22, COL.darkBlue)
  drawText('ARTIKEL', colName + 6, tableY + 7, 9, bold, COL.white)
  drawTextCenter('ZAHTEVANO', colReq, colW60, tableY + 7, 9, bold, COL.white)
  drawTextCenter('ODOBRENO',  colApp, colW60, tableY + 7, 9, bold, COL.white)

  const approvedItems = items.filter((i) => i.approvedQty > 0)
  let rowY = tableY + 22
  const ROW_H = 20

  approvedItems.forEach((item, idx) => {
    fillRect(MARGIN, rowY, USABLE_W, ROW_H, idx % 2 === 0 ? COL.gray50 : COL.white)

    let name = item.name
    while (name.length > 1 && regular.widthOfTextAtSize(name, 9) > 310) {
      name = name.slice(0, -1)
    }
    if (name !== item.name) name += '…'

    drawText(name, colName + 6, rowY + 6, 9, regular, COL.dark)
    drawTextCenter(String(item.requestedQty), colReq, colW60, rowY + 6, 9, regular, COL.gray600)
    drawTextCenter(String(item.approvedQty),  colApp, colW60, rowY + 6, 9, bold,    statusCol)

    rowY += ROW_H
  })

  strokeRect(MARGIN, tableY, USABLE_W, rowY - tableY, COL.gray200)
  vline(colReq - 4, tableY, rowY, COL.gray200)
  vline(colApp - 4, tableY, rowY, COL.gray200)

  // ── Admin notes ──────────────────────────────────────────────────────
  if (adminNotes) {
    rowY += 12
    const noteH = 40
    fillRect(MARGIN, rowY, USABLE_W, noteH, COL.yellowBg)
    strokeRect(MARGIN, rowY, USABLE_W, noteH, COL.yellowBdr)
    drawText('OPOMBA ADMINISTRATORJA:', MARGIN + 8, rowY + 6, 8, bold, COL.amberNote)
    const note = adminNotes.length > 90 ? adminNotes.slice(0, 87) + '…' : adminNotes
    drawText(note, MARGIN + 8, rowY + 18, 9, regular, COL.amberText, USABLE_W - 16)
    rowY += noteH + 8
  }

  // ── Signature lines ──────────────────────────────────────────────────
  const sigY = Math.max(rowY + 40, 630)
  hline(sigY, MARGIN, MARGIN + 160, COL.gray400)
  drawText('Podpis naročnika', MARGIN, sigY + 4, 8, regular, COL.gray600)
  drawText(requesterName, MARGIN, sigY + 14, 8, regular, COL.gray600)

  hline(sigY, 330, 490, COL.gray400)
  drawText('Podpis prevzemnika', 330, sigY + 4, 8, regular, COL.gray600)
  drawText(confirmedByName, 330, sigY + 14, 8, regular, COL.gray600)

  // ── Footer ───────────────────────────────────────────────────────────
  hline(775, MARGIN, PAGE_W - MARGIN, COL.gray200)
  const footerStr = `BuildFlow · Dobavnica #${ref} · ${dateStr}`
  drawTextCenter(footerStr, 0, PAGE_W, 780, 7.5, regular, COL.gray400)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
