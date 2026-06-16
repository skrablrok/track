'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ClipboardList, Plus, Search, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Request = {
  id: string
  status: string
  notes?: string
  adminNotes?: string
  createdAt: string
  requester: { id: string; name: string; email: string }
  project?: { id: string; name: string; location?: string }
  items: Array<{
    id: string
    requestedQty: number
    approvedQty?: number
    itemName?: string | null
    tool: { id: string; name: string; imageUrl?: string; category?: string; currentStock: number } | null
  }>
}

export default function RequestsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const isPrivileged = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const res = await fetch(`/api/requests?${params}`)
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  const filtered = requests.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.requester.name.toLowerCase().includes(q) ||
      r.project?.name.toLowerCase().includes(q) ||
      r.items.some((i) => (i.tool?.name || i.itemName || '').toLowerCase().includes(q))
    )
  })

  const pending = filtered.filter((r) => r.status === 'PENDING')
  const rest = filtered.filter((r) => r.status !== 'PENDING')

  const statusConfig = {
    PENDING:            { label: t('pending'),           color: 'bg-amber-100 text-amber-700',  icon: Clock },
    APPROVED:           { label: t('approved'),          color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
    PARTIALLY_APPROVED: { label: t('partial'),           color: 'bg-blue-100 text-blue-700',    icon: AlertCircle },
    REJECTED:           { label: t('rejected'),          color: 'bg-red-100 text-red-700',      icon: XCircle },
  }

  const filterTabs = ['ALL', 'PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED']

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('toolRequests')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isPrivileged ? t('allFieldRequests') : t('yourRequests')}
          </p>
        </div>
        <Link href="/requests/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus size={16} /> {t('newRequest')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t('search') + '…'} value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {filterTabs.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}>
              {s === 'ALL' ? t('all') : statusConfig[s as keyof typeof statusConfig]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{t('noRequestsFound')}</p>
          <Link href="/requests/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            {t('submitFirst')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {isPrivileged && pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                {t('awaitingReview')} ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((r) => <RequestRow key={r.id} request={r} isPrivileged={isPrivileged} statusConfig={statusConfig} t={t} />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {isPrivileged && pending.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('history')}</h2>
              )}
              <div className="space-y-3">
                {(isPrivileged && pending.length > 0 ? rest : filtered).map((r) => (
                  <RequestRow key={r.id} request={r} isPrivileged={isPrivileged} statusConfig={statusConfig} t={t} />
                ))}
              </div>
            </div>
          )}
          {!isPrivileged && pending.length > 0 && rest.length === 0 && (
            <div className="space-y-3">
              {pending.map((r) => <RequestRow key={r.id} request={r} isPrivileged={isPrivileged} statusConfig={statusConfig} t={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RequestRow({ request: r, isPrivileged, statusConfig, t }: {
  request: Request
  isPrivileged: boolean
  statusConfig: Record<string, { label: string; color: string; icon: any }>
  t: (key: any) => string
}) {
  const s = statusConfig[r.status] || statusConfig.PENDING
  const Icon = s.icon
  const totalRequested = r.items.reduce((sum, i) => sum + i.requestedQty, 0)
  const totalApproved = r.items.reduce((sum, i) => sum + (i.approvedQty ?? 0), 0)
  const hasCustomItem = r.items.some((i) => !i.tool)

  return (
    <Link href={`/requests/${r.id}`}
      className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-100 hover:shadow-sm transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">
            {r.items.slice(0, 2).map((i) => i.tool?.name || i.itemName).join(', ')}
            {r.items.length > 2 && ` +${r.items.length - 2}`}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
          {hasCustomItem && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {t('sourcingNeeded')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          {isPrivileged && <span>{r.requester.name}</span>}
          {r.project && <span>· {r.project.name}</span>}
          <span>· {format(new Date(r.createdAt), 'MMM d, yyyy')}</span>
          <span>· {totalRequested} {t('unitsRequested')}</span>
          {r.status !== 'PENDING' && r.status !== 'REJECTED' && (
            <span className="text-green-600">· {totalApproved} {t('unitsApproved')}</span>
          )}
        </div>
        {r.adminNotes && <p className="text-xs text-gray-400 italic mt-1 truncate">"{r.adminNotes}"</p>}
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </Link>
  )
}
