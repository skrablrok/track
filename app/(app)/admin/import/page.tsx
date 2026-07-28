'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, FileText, Download, Upload, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  type ColumnRole, type ParsedTool, type ParsedProject,
  ROLE_LABELS, detectColumns, parseRows,
} from '@/lib/excel-detection'

type Results = {
  tools: { created: number; skippedDuplicates: string[] }
  projects: { created: number; skippedDuplicates: string[] }
}

const ROLE_OPTIONS: ColumnRole[] = [
  'name', 'type', 'category', 'quantity', 'minStock', 'maxStock',
  'description', 'warehouse', 'projectName', 'projectLocation', 'skip',
]

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const toolsSheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Type (Tool/Material)', 'Category', 'Quantity', 'Min Stock', 'Max Stock', 'Description', 'Warehouse'],
    ['Cordless Drill', 'Tool', 'Power Tools', 10, 2, 15, '18V cordless drill', 'Main'],
    ['Cement Bag 25kg', 'Material', 'Other', 200, 20, 500, '', 'Storage B'],
  ])
  XLSX.utils.book_append_sheet(wb, toolsSheet, 'Tools & Materials')
  const projectsSheet = XLSX.utils.aoa_to_sheet([
    ['Project Name', 'Project Location', 'Description'],
    ['Main Street Renovation', 'Downtown', ''],
  ])
  XLSX.utils.book_append_sheet(wb, projectsSheet, 'Projects')
  XLSX.writeFile(wb, 'tooltrack-import-template.xlsx')
}

export default function ImportPage() {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // raw workbook data
  const [sheets, setSheets] = useState<string[]>([])
  const [sheetData, setSheetData] = useState<Record<string, any[][]>>({})
  const [activeSheet, setActiveSheet] = useState('')

  // per-sheet detection state
  const [hasHeaders, setHasHeaders] = useState(true)
  const [roles, setRoles] = useState<ColumnRole[]>([])
  const [headerRowIndex, setHeaderRowIndex] = useState(-1)
  const [defaultType, setDefaultType] = useState<'TOOL' | 'MATERIAL'>('TOOL')
  // { row: -1 } means whole column selected via header click; row >= 0 means specific cell
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [excludedRows, setExcludedRows] = useState<number[]>([])
  const [skippedCells, setSkippedCells] = useState<Set<string>>(new Set())
  const [cellRoles, setCellRoles] = useState<Record<string, ColumnRole>>({})
  // { sheetName: { rowIndex: dataUrl } } — extracted from the xlsx server-side
  const [sheetImageMap, setSheetImageMap] = useState<Record<string, Record<number, string>>>({})
  const [imagesLoading, setImagesLoading] = useState(false)
  const [logoSaved, setLogoSaved] = useState(false)

  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState('')

  // ── derived parsed preview ────────────────────────────────────────────────
  const rawRows = sheetData[activeSheet] ?? []
  const dataStartIdx = hasHeaders ? Math.max(headerRowIndex, 0) + 1 : 0
  const excludedRowsSet = new Set(excludedRows)
  const { tools, projects } = rawRows.length && roles.length
    ? parseRows(rawRows, hasHeaders, roles, hasHeaders ? headerRowIndex : undefined, defaultType, excludedRowsSet, skippedCells)
    : { tools: [], projects: [] }

  const totalRows = Math.max(0, rawRows.length - dataStartIdx)
  const selectedCol = selectedCell?.col ?? null
  const isColumnMode = selectedCell?.row === -1
  const imageMap: Record<number, string> = sheetImageMap[activeSheet] ?? {}
  const hasImages = Object.keys(imageMap).length > 0
  const validTools = tools.filter((r) => r.status === 'ok')
  const validProjects = projects.filter((r) => r.status === 'ok')

  // ── file handling ─────────────────────────────────────────────────────────
  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setResults(null)
    setSheetImageMap({})
    setParsing(true)
    try {
      const buf = await file.arrayBuffer()
      const isPdf = file.name.toLowerCase().endsWith('.pdf')

      if (isPdf) {
        const { parsePdfToSheets } = await import('@/lib/pdf-parser')
        const pdfSheets = await parsePdfToSheets(buf)
        if (pdfSheets.length === 0) {
          setError('V tej datoteki PDF ni bilo najdenega besedila. Datoteka je verjetno skeniran dokument — uporabite PDF z besedilom.')
          return
        }
        const allSheets: Record<string, any[][]> = {}
        for (const { name, rows } of pdfSheets) allSheets[name] = rows
        const firstSheet = pdfSheets[0].name
        setSheets(pdfSheets.map((s) => s.name))
        setSheetData(allSheets)
        setActiveSheet(firstSheet)
        applyDetection(allSheets[firstSheet] ?? [], firstSheet)
      } else {
        const wb = XLSX.read(buf, { type: 'array' })
        const allSheets: Record<string, any[][]> = {}
        for (const name of wb.SheetNames) {
          allSheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' }) as any[][]
        }
        const firstSheet = wb.SheetNames[0] ?? ''
        setSheets(wb.SheetNames)
        setSheetData(allSheets)
        setActiveSheet(firstSheet)
        applyDetection(allSheets[firstSheet] ?? [], firstSheet)
        // Extract images in the background (non-blocking)
        extractImages(file)
      }
    } catch (e: any) {
      setError(e.message || 'Could not read this file')
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function applyDetection(rows: any[][], sheetName?: string) {
    const detected = detectColumns(rows, sheetName)
    setHasHeaders(detected.hasHeaders)
    setRoles(detected.roles)
    setHeaderRowIndex(detected.headerRowIndex)
    setDefaultType(detected.defaultType)
  }

  async function extractImages(file: File) {
    setImagesLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/import/extract-images', { method: 'POST', body: fd })
      if (res.ok) setSheetImageMap(await res.json())
    } catch {
      // silently ignore — images are optional
    } finally {
      setImagesLoading(false)
    }
  }

  function switchSheet(name: string) {
    setActiveSheet(name)
    setSelectedCell(null)
    setExcludedRows([])
    setSkippedCells(new Set())
    setCellRoles({})
    applyDetection(sheetData[name] ?? [], name)
  }

  function setRole(colIdx: number, role: ColumnRole) {
    setRoles((prev) => {
      const next = [...prev]
      // Clear any other column that already has this role (except 'skip')
      if (role !== 'skip') {
        for (let i = 0; i < next.length; i++) {
          if (next[i] === role && i !== colIdx) next[i] = 'skip'
        }
      }
      next[colIdx] = role
      return next
    })
  }

  // ── import ────────────────────────────────────────────────────────────────
  async function confirmImport() {
    setSubmitting(true)
    setError('')
    try {
      const toolsWithImages = validTools.map((tool) => ({
        ...tool,
        imageUrl: imageMap[tool.rowIndex] ?? undefined,
      }))

      // Extract any individually cell-tagged project names
      const processedRows = new Set<number>()
      const cellTaggedProjects: { name: string; location?: string; status: 'ok' }[] = []
      for (const [key, role] of Object.entries(cellRoles)) {
        if (role !== 'projectName') continue
        const [rowStr, colStr] = key.split(':')
        const ri = parseInt(rowStr)
        if (processedRows.has(ri)) continue
        processedRows.add(ri)
        const row = rawRows[ri]
        const name = String(row?.[parseInt(colStr)] ?? '').trim()
        if (!name) continue
        const locEntry = Object.entries(cellRoles).find(([k, r]) => r === 'projectLocation' && parseInt(k.split(':')[0]) === ri)
        const locVal = locEntry ? String(rawRows[ri]?.[parseInt(locEntry[0].split(':')[1])] ?? '').trim() : undefined
        cellTaggedProjects.push({ name, location: locVal, status: 'ok' })
      }
      const allProjects = [
        ...validProjects,
        ...cellTaggedProjects.filter((p) => !validProjects.some((vp) => vp.name === p.name)),
      ]

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: toolsWithImages, projects: allProjects }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResults(data)
      setSheets([])
      setSheetData({})
      setActiveSheet('')
      setRoles([])
      setSelectedCell(null)
      setExcludedRows([])
      setSkippedCells(new Set())
      setCellRoles({})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const hasFile = sheets.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('bulkImport')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('bulkImportSubtitle')}</p>
      </div>

      {/* Upload / template row */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-3">
        <button onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors">
          <Download size={16} /> {t('downloadTemplate')}
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={parsing}
          className="flex items-center justify-center gap-2 flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {parsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {hasFile ? t('uploadFile') + ' (replace)' : t('uploadFile')}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.pdf" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
      )}

      {results && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800 text-sm">{t('importComplete')}</p>
          </div>
          <p className="text-sm text-green-700">
            {t('toolsCreated')}: {results.tools.created}
            {results.tools.skippedDuplicates.length > 0 && ` · ${t('skippedDuplicate')}: ${results.tools.skippedDuplicates.join(', ')}`}
          </p>
          <p className="text-sm text-green-700">
            {t('projectsCreated')}: {results.projects.created}
            {results.projects.skippedDuplicates.length > 0 && ` · ${t('skippedDuplicate')}: ${results.projects.skippedDuplicates.join(', ')}`}
          </p>
        </div>
      )}

      {/* ── Mapping UI ──────────────────────────────────────────────────── */}
      {hasFile && (
        <div className="space-y-5">
          {/* Sheet tabs */}
          {sheets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {sheets.map((s) => {
                const isPdfPage = s.startsWith('Stran ')
                const SheetIcon = isPdfPage ? FileText : FileSpreadsheet
                return (
                  <button key={s} onClick={() => switchSheet(s)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      s === activeSheet
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <SheetIcon size={13} className="inline mr-1.5 -mt-0.5" />
                    {s}
                  </button>
                )
              })}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Top bar */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {activeSheet} — {totalRows} rows
                  {validTools.length > 0 && ` · ${validTools.length} items ready`}
                  {validProjects.length > 0 && ` · ${validProjects.length} projects ready`}
                  {excludedRows.length > 0 && ` · ${excludedRows.length} excluded`}
                  {hasImages && ` · ${Object.keys(imageMap).length} images`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  Click a column header to assign role · click a data cell to skip it · click a row number to exclude the whole row.
                  {imagesLoading && <span className="flex items-center gap-1 text-blue-400"><Loader2 size={10} className="animate-spin" /> extracting images…</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={hasHeaders} onChange={(e) => setHasHeaders(e.target.checked)}
                    className="rounded" />
                  First row is header
                </label>
                <button onClick={() => applyDetection(rawRows, activeSheet)}
                  title="Re-detect columns"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Role picker / row action bar */}
            <div className={`px-4 py-2.5 border-b flex flex-wrap items-center gap-2 min-h-[44px] transition-colors ${
              selectedCell?.col === -1 ? 'bg-purple-50 border-purple-100'
              : selectedCell !== null ? 'bg-blue-50 border-blue-100'
              : 'bg-gray-50 border-gray-100'
            }`}>
              {selectedCell === null ? (
                <p className="text-xs text-gray-400">
                  Click a column header to assign role · click a data cell to skip it · click a row number to exclude the whole row.
                </p>
              ) : selectedCell.col === -1 ? (
                // Image mode — user clicked an image cell
                <>
                  <span className="text-xs font-semibold text-purple-800 mr-1">
                    Image at row {selectedCell.row + 1}:
                  </span>
                  {imageMap[selectedCell.row] && (
                    <img src={imageMap[selectedCell.row]} alt="" className="w-7 h-7 object-cover rounded border border-purple-200" />
                  )}
                  <button
                    onClick={async () => {
                      const logoUrl = imageMap[selectedCell.row]
                      if (!logoUrl) return
                      try {
                        const res = await fetch('/api/admin/org', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ logoUrl }),
                        })
                        if (res.ok) {
                          setLogoSaved(true)
                          setTimeout(() => setLogoSaved(false), 3000)
                        }
                      } catch {}
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all"
                  >
                    Set as org logo
                  </button>
                  {logoSaved && <span className="text-xs text-green-600 font-medium">✓ Logo saved</span>}
                </>
              ) : isColumnMode ? (
                // Column mode — user clicked a column header
                <>
                  <span className="text-xs font-semibold text-blue-800 mr-1">
                    {(() => {
                      const hRow = rawRows[headerRowIndex >= 0 ? headerRowIndex : 0]
                      const lbl = hasHeaders && hRow ? String(hRow[selectedCell.col] ?? '').trim() : ''
                      return (lbl || `Column ${selectedCell.col + 1}`) + ':'
                    })()}
                  </span>
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRole(selectedCell.col, r) }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                        roles[selectedCell.col] === r
                          ? r === 'skip' ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </>
              ) : (
                // Cell mode — user clicked a data cell
                <>
                  {(() => {
                    const hRow = rawRows[headerRowIndex >= 0 ? headerRowIndex : 0]
                    const lbl = hasHeaders && hRow ? String(hRow[selectedCell.col] ?? '').trim() : ''
                    const cellKey = `${selectedCell.row}:${selectedCell.col}`
                    const isCellSkipped = skippedCells.has(cellKey)
                    return (
                      <>
                        <span className="text-xs font-semibold text-blue-800 mr-1">
                          Row {selectedCell.row + 1} · {lbl || `Col ${selectedCell.col + 1}`}:
                        </span>
                        <button
                          onClick={() => {
                            setSkippedCells(prev => {
                              const next = new Set(prev)
                              if (next.has(cellKey)) next.delete(cellKey)
                              else next.add(cellKey)
                              return next
                            })
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-all ${
                            isCellSkipped
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-orange-500 border-orange-200 hover:bg-orange-50'
                          }`}
                        >
                          {isCellSkipped ? 'Include cell' : 'Skip this cell'}
                        </button>
                        {selectedCell.row !== headerRowIndex && (
                          <button
                            onClick={() => {
                              const ri = selectedCell.row
                              setExcludedRows(prev => prev.includes(ri) ? prev.filter(r => r !== ri) : [...prev, ri])
                            }}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-all ${
                              excludedRows.includes(selectedCell.row)
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-white text-red-500 border-red-200 hover:bg-red-50'
                            }`}
                          >
                            {excludedRows.includes(selectedCell.row) ? 'Include row' : 'Exclude row'}
                          </button>
                        )}
                        <span className="text-gray-300 text-xs">| Tag as:</span>
                        {ROLE_OPTIONS.filter((r) => r !== 'skip').map((r) => {
                          const currentCellRole = cellRoles[cellKey]
                          return (
                            <button
                              key={r}
                              onClick={() => {
                                setCellRoles((prev) => {
                                  const next = { ...prev }
                                  if (next[cellKey] === r) delete next[cellKey]
                                  else next[cellKey] = r
                                  return next
                                })
                              }}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                                currentCellRole === r
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-700'
                              }`}
                            >
                              {ROLE_LABELS[r]}
                            </button>
                          )
                        })}
                      </>
                    )
                  })()}
                </>
              )}
            </div>

            {/* Spreadsheet table */}
            <div className="overflow-auto max-h-[55vh]">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="sticky top-0 z-20">
                    <th className="sticky left-0 z-30 bg-white border-b-2 border-r border-gray-200 w-8 min-w-[2rem]" />
                    {hasImages && (
                      <th className="sticky left-8 z-30 bg-white border-b-2 border-r border-gray-200 w-8 px-1 text-center">
                        <ImageIcon size={11} className="text-gray-400 mx-auto" />
                      </th>
                    )}
                    {roles.map((role, ci) => {
                      const isColSelected = isColumnMode && selectedCol === ci
                      const hRow = rawRows[headerRowIndex >= 0 ? headerRowIndex : 0]
                      const colLabel = hasHeaders && hRow ? String(hRow[ci] ?? '').trim() : ''
                      return (
                        <th
                          key={ci}
                          onClick={() => setSelectedCell(prev => (prev?.col === ci && prev.row === -1) ? null : { row: -1, col: ci })}
                          className={`px-2 py-1.5 text-left font-medium cursor-pointer select-none border-b-2 border-r whitespace-nowrap transition-colors ${
                            isColSelected
                              ? 'bg-blue-100 border-blue-300 text-blue-800'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 min-w-[70px] max-w-[150px]">
                            <span className="truncate text-[11px]">{colLabel || `Col ${ci + 1}`}</span>
                            {role !== 'skip' ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold self-start ${
                                isColSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {ROLE_LABELS[role]}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 500).map((row, ri) => {
                    const isHeaderRow = hasHeaders && ri === headerRowIndex
                    const isExcluded = excludedRowsSet.has(ri)
                    return (
                      <tr key={ri} className={`border-b border-gray-50 ${
                        isExcluded ? 'bg-red-50' : isHeaderRow ? 'bg-amber-50' : 'hover:bg-gray-50/50'
                      }`}>
                        {/* Row number — click to exclude/include */}
                        <td
                          onClick={() => {
                            if (isHeaderRow) return
                            setExcludedRows(prev => prev.includes(ri) ? prev.filter(r => r !== ri) : [...prev, ri])
                            setSelectedCell(null)
                          }}
                          title={isHeaderRow ? 'Header row' : isExcluded ? 'Click to include row' : 'Click to exclude row'}
                          className={`sticky left-0 z-10 px-2 py-1 text-right border-r border-gray-100 font-mono text-[10px] select-none transition-colors ${
                            isHeaderRow
                              ? 'bg-amber-50 text-amber-400 cursor-default'
                              : isExcluded
                              ? 'bg-red-100 text-red-400 cursor-pointer hover:bg-red-200'
                              : 'bg-white text-gray-300 cursor-pointer hover:text-red-400 hover:bg-red-50'
                          }`}
                        >
                          {isExcluded ? '✕' : ri + 1}
                        </td>
                        {hasImages && (
                          <td
                            className={`sticky left-8 z-10 border-r border-gray-100 p-0.5 ${isHeaderRow ? 'bg-amber-50' : isExcluded ? 'bg-red-50' : 'bg-white'} ${imageMap[ri] ? 'cursor-pointer' : ''}`}
                            onClick={() => imageMap[ri] ? setSelectedCell(prev => (prev?.row === ri && prev?.col === -1) ? null : { row: ri, col: -1 }) : undefined}
                            title={imageMap[ri] ? 'Click to set as org logo' : undefined}
                          >
                            {imageMap[ri] ? (
                              <img
                                src={imageMap[ri]} alt=""
                                className={`w-7 h-7 object-cover rounded transition-all ${selectedCell?.row === ri && selectedCell?.col === -1 ? 'ring-2 ring-purple-500' : ''}`}
                              />
                            ) : (
                              <span className="w-7 h-7 block" />
                            )}
                          </td>
                        )}
                        {roles.map((role, ci) => {
                          const cellKey = `${ri}:${ci}`
                          const isCellSelected = selectedCell?.row === ri && selectedCell?.col === ci
                          const isColSelected = isColumnMode && selectedCol === ci
                          const isCellSkipped = skippedCells.has(cellKey)
                          const cellRole = cellRoles[cellKey]
                          const val = String(row[ci] ?? '')
                          return (
                            <td
                              key={ci}
                              onClick={() => setSelectedCell(prev => (prev?.row === ri && prev?.col === ci) ? null : { row: ri, col: ci })}
                              title={cellRole ? `Tagged: ${ROLE_LABELS[cellRole]}` : val}
                              className={`px-2 py-1 border-r border-gray-50 cursor-pointer whitespace-nowrap transition-colors ${
                                isCellSelected
                                  ? 'bg-blue-200 text-blue-900 font-semibold'
                                  : isCellSkipped
                                  ? 'text-gray-300 line-through bg-orange-50'
                                  : cellRole
                                  ? 'bg-green-100 text-green-900 ring-1 ring-inset ring-green-400'
                                  : isColSelected
                                  ? 'bg-blue-50 text-blue-800'
                                  : isExcluded
                                  ? 'text-red-300 line-through'
                                  : role === 'skip'
                                  ? 'text-gray-300'
                                  : 'text-gray-700'
                              }`}
                            >
                              {val}
                              {cellRole && (
                                <span className="ml-1 text-[9px] bg-green-600 text-white px-1 py-0.5 rounded font-semibold">
                                  {ROLE_LABELS[cellRole]}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {rawRows.length > 500 && (
                    <tr>
                      <td colSpan={roles.length + 1} className="px-3 py-2 text-center text-gray-400 border-t">
                        … {rawRows.length - 500} more rows not shown
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview of parsed result */}
          {(tools.length > 0 || projects.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h2 className="font-semibold text-gray-800 text-sm">Preview — what will be imported</h2>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {[...tools, ...projects].map((r, i) => (
                  <div key={i} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                    r.status === 'ok' ? 'bg-gray-50' : 'bg-amber-50'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {'rowIndex' in r && imageMap[r.rowIndex] ? (
                        <img src={imageMap[r.rowIndex]} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                      ) : (
                        <span className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <span className="text-gray-800 font-medium truncate">{r.name || '—'}</span>
                      {'type' in r && r.status === 'ok' && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {r.type === 'MATERIAL' ? '· material' : '· tool'}
                          {r.category ? ` · ${r.category}` : ''}
                          {' · qty ' + r.quantity}
                          {(r as ParsedTool).warehouse ? ` · ${(r as ParsedTool).warehouse}` : ''}
                        </span>
                      )}
                    </div>
                    {r.status === 'ok'
                      ? <span className="text-xs text-green-600 font-medium whitespace-nowrap ml-2">{t('willCreate')}</span>
                      : <span className="text-xs text-amber-600 font-medium flex items-center gap-1 ml-2">
                          <AlertTriangle size={11} /> {t('missingName')}
                        </span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={confirmImport}
            disabled={submitting || (validTools.length === 0 && validProjects.length === 0)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Importing…</span>
              : `${t('confirmImport')} (${validTools.length + validProjects.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
