'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { Receipt, Plus, Search, X, Trash2, User } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type ReceiptItem = { name: string; quantity: number; unitPrice: number }

type Purchase = {
  id: string
  photoUrl: string
  note?: string | null
  items?: ReceiptItem[] | null
  totalPrice?: number | null
  createdAt: string
  user: { id: string; name: string; email: string }
}

function formatPrice(n: number) {
  return `${n.toFixed(2)} €`
}

export default function PurchasesPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<Purchase | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isPrivileged = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/purchases')
    const data = await res.json()
    setPurchases(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = purchases.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.user.name.toLowerCase().includes(q) || (p.note || '').toLowerCase().includes(q)
  })

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDeletePurchase'))) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      setViewing(null)
      setPurchases((prev) => prev.filter((p) => p.id !== id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('purchases')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isPrivileged ? t('allPurchases') : t('yourPurchases')}
          </p>
        </div>
        <Link href="/purchases/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus size={16} /> {t('newPurchase')}
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder={t('search') + '…'} value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{t('noPurchasesFound')}</p>
          <Link href="/purchases/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            {t('newPurchase')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setViewing(p)}
              className="w-full flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-100 hover:shadow-sm transition-all text-left">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                {p.photoUrl
                  ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                  : <Receipt size={16} className="text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {p.note || t('purchases')}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  {isPrivileged && <span className="flex items-center gap-1"><User size={11} />{p.user.name}</span>}
                  <span>{format(new Date(p.createdAt), 'MMM d, yyyy · HH:mm')}</span>
                  {typeof p.totalPrice === 'number' && (
                    <span className="font-medium text-gray-700">{formatPrice(p.totalPrice)}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-gray-50">
              <img src={viewing.photoUrl} alt="" className="w-full max-h-[60vh] object-contain" />
              <button onClick={() => setViewing(null)}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-sm">
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><User size={11} />{viewing.user.name}</span>
                <span>{format(new Date(viewing.createdAt), 'MMM d, yyyy · HH:mm')}</span>
              </div>
              {viewing.note && <p className="text-sm text-gray-700">{viewing.note}</p>}
              {viewing.items && viewing.items.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500">
                        <th className="text-left font-medium px-3 py-2">{t('receiptItems')}</th>
                        <th className="text-center font-medium px-2 py-2">{t('qty')}</th>
                        <th className="text-right font-medium px-3 py-2">{t('unitPrice')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewing.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-800">{item.name}</td>
                          <td className="px-2 py-2 text-center text-gray-500">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{formatPrice(item.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {typeof viewing.totalPrice === 'number' && (
                      <tfoot>
                        <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-900">
                          <td className="px-3 py-2" colSpan={2}>{t('total')}</td>
                          <td className="px-3 py-2 text-right">{formatPrice(viewing.totalPrice)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
              {(isPrivileged || viewing.user.id === session?.user?.id) && (
                <button onClick={() => handleDelete(viewing.id)} disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                  <Trash2 size={14} /> {deleting ? t('submitting') : t('deletePurchase')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
