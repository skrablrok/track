'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  itemIds: string[]
  onClose: () => void
  onDone: () => void
}

export default function MarkOrderedModal({ itemIds, onClose, onDone }: Props) {
  const { t } = useLanguage()
  const [deliverTo, setDeliverTo] = useState('')
  const [knownWarehouses, setKnownWarehouses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/tools/warehouses').then((r) => r.json()).then((d) => Array.isArray(d) && setKnownWarehouses(d))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!deliverTo.trim()) { setError(t('deliverToLabel')); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/procurement/bulk-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: itemIds, deliverTo: deliverTo.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      onDone()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{t('markAsOrdered')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{itemIds.length} {t('itemsSelectedLabel')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('deliverToLabel')}</label>
            <input
              list="mark-ordered-warehouse-options"
              value={deliverTo}
              onChange={(e) => setDeliverTo(e.target.value)}
              placeholder={t('warehouse') + '…'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
            <datalist id="mark-ordered-warehouse-options">
              {knownWarehouses.map((w) => <option key={w} value={w} />)}
            </datalist>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading || !deliverTo.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? t('submitting') : t('markAsOrdered')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
