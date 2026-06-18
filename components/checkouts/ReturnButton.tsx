'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Check } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function ReturnButton({ checkoutId }: { checkoutId: string }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const disarmTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(disarmTimer.current), [])

  async function handleReturn() {
    if (!armed) {
      setArmed(true)
      disarmTimer.current = setTimeout(() => setArmed(false), 3000)
      return
    }
    clearTimeout(disarmTimer.current)
    setArmed(false)
    setError('')
    setLoading(true)
    const res = await fetch(`/api/checkouts/${checkoutId}/return`, { method: 'POST' })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed to return tool')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleReturn}
        disabled={loading}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap ${
          armed ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-50 hover:bg-green-100 text-green-700'
        }`}
      >
        {armed ? <Check size={12} /> : <CornerDownLeft size={12} />}
        {loading ? t('returning') : armed ? t('confirmQuestion') : t('returnTool')}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
