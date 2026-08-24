'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import PhotoInput from '@/components/tools/PhotoInput'

export default function NewPurchasePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [photoUrl, setPhotoUrl] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!photoUrl) { setError(t('photoRequired')); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, note }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit')
      router.push('/purchases')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
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

      <form onSubmit={handleSubmit} className="space-y-5">
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
          <button type="submit" disabled={saving || !photoUrl}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? t('submitting') : t('submitPurchase')}
          </button>
        </div>
      </form>
    </div>
  )
}
