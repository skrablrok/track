// Client-side only — always imported dynamically

export async function parsePdfToSheets(
  buf: ArrayBuffer
): Promise<{ name: string; rows: any[][] }[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
  const sheets: { name: string; rows: any[][] }[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Filter to real text items (not TextMarkedContent markers)
    const items = textContent.items
      .filter((item): item is Extract<typeof item, { str: string }> => 'str' in item && (item as any).str.trim() !== '')
      .map((item: any) => ({
        text: String(item.str).trim(),
        x: Math.round(item.transform[4] as number),
        y: Math.round(item.transform[5] as number),
      }))

    if (items.length === 0) continue

    // Group items into rows by Y coordinate (within 5-unit tolerance)
    const ROW_TOL = 5
    const rowKeys: number[] = []
    const rowValues: { text: string; x: number }[][] = []

    for (const item of items) {
      let keyIdx = rowKeys.findIndex((y) => Math.abs(item.y - y) <= ROW_TOL)
      if (keyIdx === -1) {
        rowKeys.push(item.y)
        rowValues.push([])
        keyIdx = rowKeys.length - 1
      }
      rowValues[keyIdx].push({ text: item.text, x: item.x })
    }

    // Sort rows top→bottom (PDF Y origin is bottom-left, so descending = reading order)
    const order = rowKeys
      .map((y, i) => ({ y, i }))
      .sort((a, b) => b.y - a.y)
    const sortedRows = order.map(({ i }) => rowValues[i].sort((a: { x: number }, b: { x: number }) => a.x - b.x))

    // Detect column boundaries: find significant X gaps across all items
    const seenX: Record<number, true> = {}
    const allX = items.map((i) => i.x).filter((x) => { if (seenX[x]) return false; seenX[x] = true; return true }).sort((a, b) => a - b)
    const COL_GAP = 25
    const colBoundaries: number[] = []
    let lastX = -Infinity
    for (const x of allX) {
      if (x - lastX > COL_GAP) { colBoundaries.push(x); lastX = x }
    }
    if (colBoundaries.length === 0) colBoundaries.push(0)

    // Map each text item to its column slot
    const rows: any[][] = sortedRows.map((rowCells) => {
      const row: any[] = new Array(colBoundaries.length).fill('')
      for (const cell of rowCells) {
        let colIdx = 0
        for (let i = colBoundaries.length - 1; i >= 0; i--) {
          if (cell.x >= colBoundaries[i] - 10) { colIdx = i; break }
        }
        row[colIdx] = row[colIdx] ? `${row[colIdx]} ${cell.text}` : cell.text
      }
      return row
    })

    const nonEmpty = rows.filter((r) => r.some((c) => String(c).trim() !== ''))
    if (nonEmpty.length > 0) {
      sheets.push({
        name: pdf.numPages === 1 ? 'Stran 1' : `Stran ${pageNum}`,
        rows: nonEmpty,
      })
    }
  }

  return sheets
}
