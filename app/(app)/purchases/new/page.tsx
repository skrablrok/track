'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { IconPotrjeno, IconMaterial, IconOrodje, IconIzbrisi } from '@/components/icons/BuildFlowIcons'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import PhotoInput from '@/components/tools/PhotoInput'

type AddedItem = { toolId: string; name: string; qty: number; isMaterial: boolean; isNew: boolean }
type ReviewItem = { name: string; quantity: number; unitPrice: number; toolId: string; isMaterial: boolean }

export default function NewPurchasePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [photoUrl, setPhotoUrl] = useState('')
  const [note, setNote] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [addedItems, setAddedItems] = useState<AddedItem[] | null>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null)
  const [totalPrice, setTotalPrice] = useState(0)

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!photoUrl) { setError(t('photoRequired')); return }
    setExtracting(true)
    setError('')
    try {
      const res = await fetch('/api/purchases/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to read receipt')
      setReviewItems(Array.isArray(data.items) ? data.items : [])
      setTotalPrice(typeof data.totalPrice === 'number' ? data.totalPrice : 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  function updateItem(idx: number, patch: Partial<ReviewItem>) {
    setReviewItems((prev) => prev ? prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)) : prev)
  }

  function removeItem(idx: number) {
    setReviewItems((prev) => prev ? prev.filter((_, i) => i !== idx) : prev)
  }

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, note, items: reviewItems || [], totalPrice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      if (Array.isArray(data.addedItems) && data.addedItems.length > 0) {
        setAddedItems(data.addedItems)
      } else {
        router.push('/purchases')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (addedItems) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 fade-in">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <IconPotrjeno className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{t('addedToInventoryLabel')}</h1>
          <div className="text-left space-y-2">
            {addedItems.map((item, i) => {
              const Icon = item.isMaterial ? IconMaterial : IconOrodje
              return (
                <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{item.qty}×</span>
                      {item.isNew && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {t('newItemLabel')}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.isMaterial ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.isMaterial ? t('consumed') : t('inUse')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => router.push('/purchases')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors">
            {t('continueLabel')}
          </button>
        </div>
      </div>
    )
  }

  if (reviewItems) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setReviewItems(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reviewItemsTitle')}</h1>
            <p className="text-sm text-gray-500">{t('reviewItemsHint')}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
        )}

        {reviewItems.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
            {t('noItemsRecognizedLabel')}
          </div>
        ) : (
          <div className="space-y-3">
            {reviewItems.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="text" value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => removeItem(idx)} aria-label={t('removeItemLabel')}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                    <IconIzbrisi size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500">{t('qty')}</label>
                    <input type="number" min={0} step="any" value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500">{t('unitPrice')}</label>
                    <input type="number" min={0} step="0.01" value={item.unitPrice}
                      onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <button type="button" onClick={() => updateItem(idx, { isMaterial: false })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${!item.isMaterial ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      {t('toolTypeLabel')}
                    </button>
                    <button type="button" onClick={() => updateItem(idx, { isMaterial: true })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${item.isMaterial ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      {t('materialTypeLabel')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => setReviewItems(null)}
            className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            {t('backLabel')}
          </button>
          <button type="button" onClick={handleConfirm} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? t('submitting') : t('submitPurchase')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div className="flex items-center gap-3">
        <Link href="/purchases" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('newPurchase')}</h1>
          <p className="text-sm text-gray-500">{t('purchaseHint')}</p>
        </div>
      </div>

      <form onSubmit={handleContinue} className="space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <PhotoInput value={photoUrl} onChange={setPhotoUrl} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('purchaseNote')}</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={t('purchaseNotePlaceholder')} rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/purchases"
            className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            {t('cancel')}
          </Link>
          <button type="submit" disabled={extracting || !photoUrl}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {extracting ? t('extractingReceiptLabel') : t('continueLabel')}
          </button>
        </div>
      </form>
    </div>
  )
}
