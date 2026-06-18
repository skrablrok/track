'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Check, X, Clock } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useSession } from 'next-auth/react'

export default function ReturnButton({ checkoutId, status }: { checkoutId: string; status: string }) {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')

  const [loading, setLoading] = useState(false)
  const [armed, setArmed] = useState(false)
  const [adminAction, setAdminAction] = useState<'confirm' | 'reject' | null>(null)
  const [error, setError] = useState('')
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
      setError(d.error || 'Failed')
      return
    }
    router.refresh()
  }

  async function handleAdminAction(action: 'confirm' | 'reject') {
    setAdminAction(action)
    setError('')
    const res = await fetch(`/api/checkouts/${checkoutId}/confirm-return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setAdminAction(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed')
      return
    }
    router.refresh()
  }

  if (status === 'PENDING_RETURN') {
    if (!isAdmin) {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap">
            <Clock size={12} /> {t('awaitingApproval')}
          </span>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <button
            onClick={() => handleAdminAction('confirm')}
            disabled={adminAction !== null}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <Check size={12} />
            {adminAction === 'confirm' ? t('confirming') : t('confirmReturn')}
          </button>
          <button
            onClick={() => handleAdminAction('reject')}
            disabled={adminAction !== null}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <X size={12} />
            {adminAction === 'reject' ? '…' : t('rejectReturn')}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
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
