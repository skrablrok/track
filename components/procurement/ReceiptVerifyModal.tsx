'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import PhotoInput from '@/components/tools/PhotoInput'

interface Props {
  itemIds: string[]
  onClose: () => void
  onDone: (result: { matched: number; unmatched: number }) => void
}

export default function ReceiptVerifyModal({ itemIds, onClose, onDone }: Props) {
  const { t } = useLanguage()
  const [photoUrl, setPhotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!photoUrl) { setError(t('photoRequired')); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/procurement/verify-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: itemIds, photoUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onDone({ matched: data.matched, unmatched: data.unmatched })
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
            <h2 className="font-bold text-gray-900">{t('checkReceipt')}</h2>
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
          <PhotoInput value={photoUrl} onChange={setPhotoUrl} />
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading || !photoUrl}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? t('submitting') : t('checkReceipt')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
