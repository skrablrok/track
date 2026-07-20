'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, FileText, Download, Upload, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
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

  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState('')

  // ── derived parsed preview ────────────────────────────────────────────────
  const rawRows = sheetData[activeSheet] ?? []
  const { tools, projects } = rawRows.length && roles.length
    ? parseRows(rawRows, hasHeaders, roles)
    : { tools: [], projects: [] }

  const previewRows = rawRows.slice(hasHeaders ? 1 : 0, (hasHeaders ? 1 : 0) + 5)
  const totalRows = hasHeaders ? Math.max(0, rawRows.length - 1) : rawRows.length
  const validTools = tools.filter((r) => r.status === 'ok')
  const validProjects = projects.filter((r) => r.status === 'ok')

  // ── file handling ─────────────────────────────────────────────────────────
  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setResults(null)
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
        applyDetection(allSheets[firstSheet] ?? [])
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
        applyDetection(allSheets[firstSheet] ?? [])
      }
    } catch (e: any) {
      setError(e.message || 'Could not read this file')
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function applyDetection(rows: any[][]) {
    const detected = detectColumns(rows)
    setHasHeaders(detected.hasHeaders)
    setRoles(detected.roles)
  }

  function switchSheet(name: string) {
    setActiveSheet(name)
    applyDetection(sheetData[name] ?? [])
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
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: validTools, projects: validProjects }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResults(data)
      setSheets([])
      setSheetData({})
      setActiveSheet('')
      setRoles([])
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
            {/* Header: stats + controls */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {activeSheet} — {totalRows} rows
                  {tools.length > 0 && ` · ${validTools.length} tools/materials`}
                  {projects.length > 0 && ` · ${validProjects.length} projects`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Assign a role to each column. The system auto-detected them — correct any mistakes below.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={hasHeaders} onChange={(e) => setHasHeaders(e.target.checked)}
                    className="rounded" />
                  First row is header
                </label>
                <button onClick={() => applyDetection(rawRows)}
                  title="Re-detect columns"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Column mapping + preview table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Role selectors */}
                  <tr className="bg-blue-50 border-b border-blue-100">
                    {roles.map((role, ci) => (
                      <th key={ci} className="px-3 py-2 text-left font-medium min-w-[140px]">
                        <select
                          value={role}
                          onChange={(e) => setRole(ci, e.target.value as ColumnRole)}
                          className={`w-full text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            role === 'skip'
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : 'bg-white text-blue-700 border-blue-200 font-semibold'
                          }`}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                  {/* Original header row (if hasHeaders) */}
                  {hasHeaders && rawRows[0] && (
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {rawRows[0].map((h, ci) => (
                        <th key={ci} className="px-3 py-2 text-left text-xs text-gray-500 font-normal">
                          {String(h)}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      {roles.map((role, ci) => (
                        <td key={ci} className={`px-3 py-2 text-xs ${role === 'skip' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {String(row[ci] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {totalRows > 5 && (
                    <tr>
                      <td colSpan={roles.length} className="px-3 py-2 text-xs text-gray-400 text-center">
                        … {totalRows - 5} more rows
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
