'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function RestockButton({ toolId }: { toolId: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleOpen() {
    setOpen(true)
    setAmount('')
    setError('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleCancel() {
    setOpen(false)
    setAmount('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseInt(amount)
    if (!qty || qty <= 0) { setError(t('enterValidAmount')); return }
    setError('')
    setLoading(true)
    const res = await fetch(`/api/tools/${toolId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: qty }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed to restock')
      return
    }
    setOpen(false)
    setAmount('')
    router.refresh()
  }

  if (open) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder={t('unitsToAdd')}
            className="w-28 px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-center"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            <Check size={12} />
            {loading ? '…' : t('restockAdd')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    )
  }

  return (
    <button
      onClick={handleOpen}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-xl transition-colors"
    >
      <Plus size={13} />
      {t('restock')}
    </button>
  )
}
