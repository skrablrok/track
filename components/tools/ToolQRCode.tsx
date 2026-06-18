'use client'

import { useEffect, useState } from 'react'
import { QrCode, Download } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  toolId: string
  toolName: string
  qrCode: string
}

export default function ToolQRCode({ toolId, toolName, qrCode }: Props) {
  const { t } = useLanguage()
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tools/${toolId}/qr`)
      .then((r) => r.json())
      .then((d) => { setQrDataUrl(d.qrDataUrl); setLoading(false) })
      .catch(() => setLoading(false))
  }, [toolId])

  function download() {
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${toolName.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
      <div className="flex items-center gap-2 mb-4 justify-center">
        <QrCode size={16} className="text-gray-400" />
        <h3 className="font-semibold text-gray-800 text-sm">{t('qrCode')}</h3>
      </div>

      {loading ? (
        <div className="w-40 h-40 bg-gray-100 rounded-xl mx-auto animate-pulse" />
      ) : qrDataUrl ? (
        <div className="flex flex-col items-center gap-3">
          <img src={qrDataUrl} alt={`QR code for ${toolName}`} className="w-40 h-40 rounded-xl" />
          <p className="text-xs text-gray-400 font-mono">{qrCode}</p>
          <button
            onClick={download}
            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Download size={14} />
            {t('downloadQR')}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400">{t('qrLoadError')}</p>
      )}
    </div>
  )
}
