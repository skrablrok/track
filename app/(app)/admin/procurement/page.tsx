'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ShoppingCart, AlertTriangle, Package, Truck, CheckCircle2, CheckSquare, Check, X, Receipt } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import ReceiptVerifyModal from '@/components/procurement/ReceiptVerifyModal'

type ProcurementItem = {
  id: string
  itemName?: string | null
  requestedQty: number
  procurementStatus: string
  procurementUpdatedAt: string
  requestId: string
  tool: { id: string; name: string; imageUrl?: string; currentStock: number } | null
  purchase: { id: string; photoUrl: string } | null
  request: {
    id: string
    createdAt: string
    requester: { id: string; name: string }
    project?: { id: string; name: string } | null
  }
}

const STAGES = ['PENDING_PURCHASE', 'ORDERED', 'RECEIVED', 'COMPLETED'] as const
type StatusFilter = 'ALL' | typeof STAGES[number] | 'NOT_ON_RECEIPT'

export default function ProcurementPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOrdering, setBulkOrdering] = useState(false)
  const [receiptModalIds, setReceiptModalIds] = useState<string[] | null>(null)
  const [resultBanner, setResultBanner] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const res = await fetch(`/api/admin/procurement?${params}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])
  useEffect(() => { exitSelectionMode() }, [statusFilter])

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function setStatus(id: string, status: string) {
    setUpdating(id)
    setError('')
    try {
      const res = await fetch(`/api/request-items/${id}/procurement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed')
        return
      }
      await load()
    } finally {
      setUpdating(null)
    }
  }

  async function advance(item: ProcurementItem) {
    const idx = STAGES.indexOf(item.procurementStatus as typeof STAGES[number])
    const next = STAGES[idx + 1]
    if (!next) return
    await setStatus(item.id, next)
  }

  async function handleBulkOrder() {
    setBulkOrdering(true)
    setError('')
    try {
      const res = await fetch('/api/admin/procurement/bulk-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed')
        return
      }
      exitSelectionMode()
      await load()
    } finally {
      setBulkOrdering(false)
    }
  }

  function handleReceiptDone(result: { matched: number; unmatched: number }) {
    setReceiptModalIds(null)
    exitSelectionMode()
    setResultBanner(`${result.matched} ${t('matchedOnReceipt').toLowerCase()} · ${result.unmatched} ${t('notOnReceipt').toLowerCase()}`)
    load()
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any; nextLabel?: string }> = {
    PENDING_PURCHASE: { label: t('procurementPending'),   color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle, nextLabel: t('markOrdered') },
    ORDERED:           { label: t('procurementOrdered'),  color: 'bg-blue-100 text-blue-700',    icon: Truck,         nextLabel: t('markReceived') },
    RECEIVED:          { label: t('procurementReceived'), color: 'bg-purple-100 text-purple-700', icon: Package,      nextLabel: t('markCompleted') },
    COMPLETED:         { label: t('procurementCompleted'), color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
    NOT_ON_RECEIPT:    { label: t('notOnReceipt'),         color: 'bg-red-100 text-red-700',      icon: AlertTriangle },
  }

  const filterTabs = ['ALL', ...STAGES, 'NOT_ON_RECEIPT'] as const
  const canBulkOrder = statusFilter === 'PENDING_PURCHASE'
  const canBulkReceipt = statusFilter === 'ORDERED'
  const canSelect = canBulkOrder || canBulkReceipt

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('procurementQueue')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('sourcingNeeded')}</p>
        </div>
        {canSelect && !selectionMode && (
          <button onClick={() => setSelectionMode(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <CheckSquare size={16} />{t('selectItems')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
      )}
      {resultBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-center justify-between">
          {resultBanner}
          <button onClick={() => setResultBanner(null)} className="text-blue-400 hover:text-blue-600"><X size={14} /></button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {filterTabs.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s as StatusFilter)}
            className={`whitespace-nowrap px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}>
            {s === 'ALL' ? t('all') : statusConfig[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{t('noRequestsFound')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cfg = statusConfig[item.procurementStatus] || statusConfig.PENDING_PURCHASE
            const Icon = cfg.icon
            const isCustom = !item.tool
            const isSelected = selectedIds.has(item.id)
            const isNotOnReceipt = item.procurementStatus === 'NOT_ON_RECEIPT'

            const Row = (
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {selectionMode && (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={11} className="text-white" />}
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectionMode ? (
                      <span className="font-semibold text-gray-900 text-sm">{isCustom ? item.itemName : item.tool!.name}</span>
                    ) : (
                      <Link href={`/requests/${item.requestId}`} className="font-semibold text-gray-900 text-sm hover:underline">
                        {isCustom ? item.itemName : item.tool!.name}
                      </Link>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{item.request.requester.name}</span>
                    {item.request.project && <span>· {item.request.project.name}</span>}
                    <span>· {format(new Date(item.request.createdAt), 'MMM d, yyyy')}</span>
                    <span>· {item.requestedQty} {t('unitsRequested')}</span>
                    {!isCustom && <span>· {item.tool!.currentStock} {t('inStock')}</span>}
                    {item.purchase && !selectionMode && (
                      <a href={item.purchase.photoUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Receipt size={11} />{t('viewReceipt')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )

            return (
              <div key={item.id} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4">
                {selectionMode ? (
                  <button onClick={() => toggleSelect(item.id)} className="flex-1 text-left min-w-0">{Row}</button>
                ) : (
                  Row
                )}
                {!selectionMode && cfg.nextLabel && (
                  <button
                    onClick={() => advance(item)}
                    disabled={updating === item.id}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {updating === item.id ? '…' : cfg.nextLabel}
                  </button>
                )}
                {!selectionMode && isNotOnReceipt && (
                  <div className="flex-shrink-0 flex gap-1.5">
                    <button onClick={() => setStatus(item.id, 'ORDERED')} disabled={updating === item.id}
                      className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                      {updating === item.id ? '…' : t('retryProcurement')}
                    </button>
                    <button onClick={() => setStatus(item.id, 'PENDING_PURCHASE')} disabled={updating === item.id}
                      className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                      {t('reorderItem')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {receiptModalIds && (
        <ReceiptVerifyModal
          itemIds={receiptModalIds}
          onClose={() => setReceiptModalIds(null)}
          onDone={handleReceiptDone}
        />
      )}

      {selectionMode && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium">
            {selectedIds.size === 0 ? t('selectItems') : `${selectedIds.size} ${t('itemsSelectedLabel')}`}
          </span>
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setSelectedIds(new Set(items.map((i) => i.id)))}
                className="text-xs text-gray-300 hover:text-white underline">
                {t('selectAllItems')}
              </button>
              {canBulkOrder && (
                <button onClick={handleBulkOrder} disabled={bulkOrdering}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-60">
                  {bulkOrdering ? '…' : `${t('markAsOrdered')} (${selectedIds.size})`}
                </button>
              )}
              {canBulkReceipt && (
                <button onClick={() => setReceiptModalIds(Array.from(selectedIds))}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl">
                  <Receipt size={13} /> {t('checkReceipt')} ({selectedIds.size})
                </button>
              )}
            </>
          )}
          <button onClick={exitSelectionMode} className="p-1.5 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
