'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const TOOLS_SHEET = 'Tools & Materials'
const PROJECTS_SHEET = 'Projects'

type ToolRow = {
  name: string
  type: 'TOOL' | 'MATERIAL'
  category: string
  quantity: number
  minStock: number
  maxStock: number
  description: string
  status: 'ok' | 'missingName' | 'invalidQuantity'
}

type ProjectRow = {
  name: string
  location: string
  description: string
  status: 'ok' | 'missingName'
}

type Results = {
  tools: { created: number; skippedDuplicates: string[] }
  projects: { created: number; skippedDuplicates: string[] }
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  const toolsSheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Type (Tool/Material)', 'Category', 'Quantity', 'Min Stock', 'Max Stock', 'Description'],
    ['Cordless Drill', 'Tool', 'Power Tools', 10, 2, 15, '18V cordless drill'],
    ['Cement Bag 25kg', 'Material', 'Other', 200, 20, 500, ''],
  ])
  XLSX.utils.book_append_sheet(wb, toolsSheet, TOOLS_SHEET)

  const projectsSheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Location', 'Description'],
    ['Main Street Renovation', 'Downtown', ''],
  ])
  XLSX.utils.book_append_sheet(wb, projectsSheet, PROJECTS_SHEET)

  XLSX.writeFile(wb, 'tooltrack-import-template.xlsx')
}

export default function ImportPage() {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tools, setTools] = useState<ToolRow[] | null>(null)
  const [projects, setProjects] = useState<ProjectRow[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setResults(null)
    setParsing(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })

      const toolsWs = wb.Sheets[TOOLS_SHEET]
      const toolsRaw: any[] = toolsWs ? XLSX.utils.sheet_to_json(toolsWs) : []
      const parsedTools: ToolRow[] = toolsRaw.map((r) => {
        const name = String(r['Name'] ?? '').trim()
        const quantity = parseInt(r['Quantity'])
        const type = String(r['Type (Tool/Material)'] ?? '').trim().toUpperCase() === 'MATERIAL' ? 'MATERIAL' : 'TOOL'
        return {
          name,
          type,
          category: String(r['Category'] ?? '').trim(),
          quantity: isNaN(quantity) ? 0 : quantity,
          minStock: parseInt(r['Min Stock']) || 2,
          maxStock: parseInt(r['Max Stock']) || 10,
          description: String(r['Description'] ?? '').trim(),
          status: !name ? 'missingName' : isNaN(quantity) || quantity < 0 ? 'invalidQuantity' : 'ok',
        }
      })

      const projectsWs = wb.Sheets[PROJECTS_SHEET]
      const projectsRaw: any[] = projectsWs ? XLSX.utils.sheet_to_json(projectsWs) : []
      const parsedProjects: ProjectRow[] = projectsRaw.map((r) => {
        const name = String(r['Name'] ?? '').trim()
        return {
          name,
          location: String(r['Location'] ?? '').trim(),
          description: String(r['Description'] ?? '').trim(),
          status: !name ? 'missingName' : 'ok',
        }
      })

      setTools(parsedTools)
      setProjects(parsedProjects)
    } catch (e: any) {
      setError(e.message || 'Could not read this file')
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function confirmImport() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: (tools || []).filter((r) => r.status === 'ok'),
          projects: (projects || []).filter((r) => r.status === 'ok'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResults(data)
      setTools(null)
      setProjects(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const validToolCount = tools?.filter((r) => r.status === 'ok').length ?? 0
  const validProjectCount = projects?.filter((r) => r.status === 'ok').length ?? 0
  const hasPreview = tools !== null || projects !== null

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('bulkImport')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('bulkImportSubtitle')}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-3">
        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          <Download size={16} /> {t('downloadTemplate')}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
          className="flex items-center justify-center gap-2 flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {parsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {t('uploadFile')}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>}

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

      {hasPreview && !results && (
        <div className="space-y-5">
          {tools && tools.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet size={16} /> {TOOLS_SHEET} ({validToolCount}/{tools.length})
              </h2>
              <div className="space-y-2">
                {tools.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${r.status === 'ok' ? 'bg-gray-50' : 'bg-amber-50'}`}>
                    <span className="text-gray-700">{r.name || '—'} {r.status === 'ok' && <span className="text-gray-400">· qty {r.quantity} · {r.type}</span>}</span>
                    {r.status === 'ok'
                      ? <span className="text-xs text-green-600 font-medium">{t('willCreate')}</span>
                      : <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><AlertTriangle size={11} /> {t(r.status === 'missingName' ? 'missingName' : 'invalidQuantity')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects && projects.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet size={16} /> {PROJECTS_SHEET} ({validProjectCount}/{projects.length})
              </h2>
              <div className="space-y-2">
                {projects.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${r.status === 'ok' ? 'bg-gray-50' : 'bg-amber-50'}`}>
                    <span className="text-gray-700">{r.name || '—'}</span>
                    {r.status === 'ok'
                      ? <span className="text-xs text-green-600 font-medium">{t('willCreate')}</span>
                      : <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><AlertTriangle size={11} /> {t('missingName')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={confirmImport}
            disabled={submitting || (validToolCount === 0 && validProjectCount === 0)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? '…' : `${t('confirmImport')} (${validToolCount + validProjectCount})`}
          </button>
        </div>
      )}
    </div>
  )
}
