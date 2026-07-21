import PDFDocument from 'pdfkit'

type Item = { name: string; requestedQty: number; approvedQty: number }

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
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const { requestId, requesterName, confirmedByName, projectName, status, confirmedAt, items, adminNotes } = details
    const refNumber = requestId.slice(-8).toUpperCase()
    const dateStr = confirmedAt.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = confirmedAt.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
    const statusLabel = status === 'APPROVED' ? 'POTRJENO' : 'DELNO POTRJENO'
    const W = 495 // usable width (595 - 50 - 50)

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(50, 45, W, 52).fill('#1e3a5f')

    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text('BuildFlow', 62, 54)
    doc.fontSize(9).font('Helvetica')
       .text('Upravljanje inventarja orodij', 62, 76)

    doc.fontSize(22).font('Helvetica-Bold')
       .text('DOBAVNICA', 0, 54, { align: 'right', width: 535 })
    doc.fontSize(9).font('Helvetica')
       .text('Delivery Note', 0, 76, { align: 'right', width: 535 })

    // ── Reference / date strip ───────────────────────────────────────────
    doc.fillColor('#374151').fontSize(9).font('Helvetica')
    const stripY = 108
    doc.text(`Ref: #${refNumber}`, 50, stripY)
    doc.text(`Datum: ${dateStr}  ob  ${timeStr}`, 0, stripY, { align: 'right', width: 545 })

    // Status badge
    const badgeBg = status === 'APPROVED' ? '#dcfce7' : '#fef3c7'
    const badgeFg = status === 'APPROVED' ? '#15803d' : '#b45309'
    const badgeW = 110
    const badgeX = 50 + W / 2 - badgeW / 2
    doc.rect(badgeX, stripY - 3, badgeW, 16).fill(badgeBg)
    doc.fillColor(badgeFg).fontSize(8).font('Helvetica-Bold')
       .text(statusLabel, badgeX, stripY, { width: badgeW, align: 'center' })

    // ── Divider ──────────────────────────────────────────────────────────
    doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#cbd5e1').lineWidth(1).stroke()

    // ── Parties ──────────────────────────────────────────────────────────
    const colW = W / 2 - 8
    const boxY = 138

    // Left box — naročnik
    doc.rect(50, boxY, colW, 64).fill('#f8fafc')
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica-Bold')
       .text('NAROČNIK', 58, boxY + 8)
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold')
       .text(requesterName, 58, boxY + 20)
    if (projectName) {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica')
         .text(`Projekt: ${projectName}`, 58, boxY + 36)
    }

    // Right box — potrdil
    const rightX = 50 + colW + 16
    doc.rect(rightX, boxY, colW, 64).fill('#f8fafc')
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica-Bold')
       .text('POTRDIL', rightX + 8, boxY + 8)
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold')
       .text(confirmedByName, rightX + 8, boxY + 20)
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
       .text(dateStr, rightX + 8, boxY + 36)

    // ── Items table ──────────────────────────────────────────────────────
    const tableY = boxY + 80
    const colName = 50
    const colReq  = 390
    const colApp  = 465

    // Table header
    doc.rect(50, tableY, W, 22).fill('#1e3a5f')
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
    doc.text('ARTIKEL', colName + 6, tableY + 7)
    doc.text('ZAHTEVANO', colReq, tableY + 7, { width: 60, align: 'center' })
    doc.text('ODOBRENO', colApp, tableY + 7, { width: 60, align: 'center' })

    const approvedItems = items.filter((i) => i.approvedQty > 0)
    let rowY = tableY + 22
    const rowH = 20

    approvedItems.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#f8fafc' : 'white'
      doc.rect(50, rowY, W, rowH).fill(bg)

      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
         .text(item.name, colName + 6, rowY + 6, { width: 320, ellipsis: true })

      doc.fillColor('#64748b')
         .text(String(item.requestedQty), colReq, rowY + 6, { width: 60, align: 'center' })

      const approvedColor = status === 'APPROVED' ? '#15803d' : '#b45309'
      doc.fillColor(approvedColor).font('Helvetica-Bold')
         .text(String(item.approvedQty), colApp, rowY + 6, { width: 60, align: 'center' })

      rowY += rowH
    })

    // Table bottom border
    doc.rect(50, tableY, W, rowY - tableY).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.moveTo(colReq - 4, tableY).lineTo(colReq - 4, rowY).stroke()
    doc.moveTo(colApp - 4, tableY).lineTo(colApp - 4, rowY).stroke()

    // ── Admin notes ──────────────────────────────────────────────────────
    if (adminNotes) {
      rowY += 12
      doc.rect(50, rowY, W, 36).fill('#fefce8')
      doc.rect(50, rowY, W, 36).strokeColor('#fde68a').lineWidth(0.5).stroke()
      doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold')
         .text('OPOMBA ADMINISTRATORJA:', 58, rowY + 6)
      doc.fillColor('#78350f').fontSize(9).font('Helvetica')
         .text(adminNotes, 58, rowY + 18, { width: W - 16 })
      rowY += 48
    }

    // ── Signature lines ──────────────────────────────────────────────────
    const sigY = Math.max(rowY + 40, 620)
    doc.moveTo(50, sigY).lineTo(210, sigY).strokeColor('#94a3b8').lineWidth(0.5).stroke()
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text('Podpis naročnika', 50, sigY + 4)
    doc.text(requesterName, 50, sigY + 14, { width: 160 })

    doc.moveTo(330, sigY).lineTo(490, sigY).stroke()
    doc.text('Podpis prevzemnika', 330, sigY + 4)
    doc.text(confirmedByName, 330, sigY + 14, { width: 160 })

    // ── Footer ───────────────────────────────────────────────────────────
    doc.moveTo(50, 775).lineTo(545, 775).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
       .text(`BuildFlow · Dobavnica #${refNumber} · ${dateStr}`, 50, 780, { align: 'center', width: W })

    doc.end()
  })
}
