'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ShoppingCart, AlertTriangle, Package, Truck, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type ProcurementItem = {
  id: string
  itemName?: string | null
  requestedQty: number
  procurementStatus: string
  procurementUpdatedAt: string
  requestId: string
  tool: { id: string; name: string; imageUrl?: string; currentStock: number } | null
  request: {
    id: string
    createdAt: string
    requester: { id: string; name: string }
    project?: { id: string; name: string } | null
  }
}

const STAGES = ['PENDING_PURCHASE', 'ORDERED', 'RECEIVED', 'COMPLETED'] as const

export default function ProcurementPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<ProcurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [updating, setUpdating] = useState<string | null>(null)

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

  async function advance(item: ProcurementItem) {
    const idx = STAGES.indexOf(item.procurementStatus as typeof STAGES[number])
    const next = STAGES[idx + 1]
    if (!next) return
    setUpdating(item.id)
    try {
      await fetch(`/api/request-items/${item.id}/procurement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      await load()
    } finally {
      setUpdating(null)
    }
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any; nextLabel?: string }> = {
    PENDING_PURCHASE: { label: t('procurementPending'),   color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle, nextLabel: t('markOrdered') },
    ORDERED:           { label: t('procurementOrdered'),  color: 'bg-blue-100 text-blue-700',    icon: Truck,         nextLabel: t('markReceived') },
    RECEIVED:          { label: t('procurementReceived'), color: 'bg-purple-100 text-purple-700', icon: Package,      nextLabel: t('markCompleted') },
    COMPLETED:         { label: t('procurementCompleted'), color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  }

  const filterTabs = ['ALL', ...STAGES]

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('procurementQueue')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('sourcingNeeded')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {filterTabs.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
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
            return (
              <div key={item.id} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/requests/${item.requestId}`} className="font-semibold text-gray-900 text-sm hover:underline">
                      {isCustom ? item.itemName : item.tool!.name}
                    </Link>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{item.request.requester.name}</span>
                    {item.request.project && <span>· {item.request.project.name}</span>}
                    <span>· {format(new Date(item.request.createdAt), 'MMM d, yyyy')}</span>
                    <span>· {item.requestedQty} {t('unitsRequested')}</span>
                    {!isCustom && <span>· {item.tool!.currentStock} {t('inStock')}</span>}
                  </div>
                </div>
                {cfg.nextLabel && (
                  <button
                    onClick={() => advance(item)}
                    disabled={updating === item.id}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {updating === item.id ? '…' : cfg.nextLabel}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
