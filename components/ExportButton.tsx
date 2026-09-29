'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  className?: string
  endpoint?: string
  filenamePrefix?: string
  label?: string
}

export default function ExportButton({ className, endpoint = '/api/reports/export', filenamePrefix = 'BuildFlow_Report', label }: Props) {
  const { t } = useLanguage()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const month = new Date().toISOString().slice(0, 7)
      const sep = endpoint.includes('?') ? '&' : '?'
      const res = await fetch(`${endpoint}${sep}month=${month}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filenamePrefix}_${month}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setExporting(false)
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={className || 'flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60'}
    >
      <Download size={15} />
      {exporting ? t('exporting') : (label || t('exportLabel'))}
    </button>
  )
}
