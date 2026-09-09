'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function ExportButton({ className }: { className?: string }) {
  const { t } = useLanguage()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const month = new Date().toISOString().slice(0, 7)
      const res = await fetch(`/api/reports/export?month=${month}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BuildFlow_Report_${month}.xlsx`
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
      {exporting ? t('exporting') : t('exportLabel')}
    </button>
  )
}
