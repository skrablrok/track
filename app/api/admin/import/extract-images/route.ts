export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireRole, forbidden, serverError, unauthorized } from '@/lib/utils'

// Returns { [sheetName]: { [rowIndex0based]: dataUrl } }
export async function POST(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER'])

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({})

    const arrayBuf = await file.arrayBuffer()

    const workbook = new ExcelJS.Workbook()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (workbook.xlsx as any).load(arrayBuf)

    const result: Record<string, Record<number, string>> = {}

    for (const worksheet of workbook.worksheets) {
      const images = (worksheet as any).getImages() as any[]
      if (!images || !images.length) continue

      const sheetImages: Record<number, string> = {}

      for (const image of images) {
        try {
          const img = (workbook as any).getImage(image.imageId) as {
            buffer: Buffer | ArrayBuffer
            extension?: string
          }
          if (!img?.buffer) continue

          const rowIndex: number = Math.floor(
            image.range?.tl?.nativeRow ?? image.range?.tl?.row ?? 0
          )

          if (rowIndex in sheetImages) continue // first image per row wins

          const ext = ((img.extension ?? 'png').toLowerCase()).replace('jpg', 'jpeg')
          const mime = ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
          const b64 = Buffer.from(img.buffer as ArrayBuffer).toString('base64')
          sheetImages[rowIndex] = `data:${mime};base64,${b64}`
        } catch {
          // skip malformed image entries
        }
      }

      if (Object.keys(sheetImages).length > 0) {
        result[worksheet.name] = sheetImages
      }
    }

    return NextResponse.json(result)
  } catch (e: any) {
    if (e.message === 'Unauthorized') return unauthorized()
    if (e.message === 'Forbidden') return forbidden()
    return serverError(e.message)
  }
}
