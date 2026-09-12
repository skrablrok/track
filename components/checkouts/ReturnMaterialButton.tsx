'use client'

import { useRef, useState } from 'react'
import { CornerDownLeft, Check, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function ReturnMaterialButton({
  checkoutId,
  remaining,
  onReturned,
}: {
  checkoutId: string
  remaining: number
  onReturned: () => void
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (!qty || qty <= 0 || qty > remaining) { setError(t('enterValidAmount')); return }
    setError('')
    setLoading(true)
    const res = await fetch(`/api/checkouts/${checkoutId}/return-material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed')
      return
    }
    setOpen(false)
    setAmount('')
    onReturned()
  }

  if (open) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-1 items-end">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder={t('qtyToReturn')}
            className="w-24 px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-center"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            <Check size={12} />
            {loading ? '…' : t('returnTool')}
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
      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 transition-colors whitespace-nowrap"
    >
      <CornerDownLeft size={12} /> {t('returnUnused')}
    </button>
  )
}
