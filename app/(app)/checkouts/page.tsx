'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { formatMinutes } from '@/lib/utils'
import { Search, Clock, MapPin, User, Wrench, CornerDownLeft, Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Checkout = {
  id: string
  checkoutDate: string
  returnDate?: string
  durationMins?: number
  status: 'ACTIVE' | 'RETURNED' | 'CONSUMED' | 'PENDING_RETURN'
  quantity: number
  notes?: string
  tool: { id: string; name: string; imageUrl?: string; category?: string; type?: string }
  user: { id: string; name: string; email: string }
  project?: { id: string; name: string; location?: string }
}

export default function CheckoutsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [checkouts, setCheckouts] = useState<Checkout[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING_RETURN' | 'RETURNED' | 'CONSUMED'>('ALL')
  const [search, setSearch] = useState('')
  const [returning, setReturning] = useState<string | null>(null)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [adminAction, setAdminAction] = useState<{ id: string; action: 'confirm' | 'reject' } | null>(null)
  const [returnError, setReturnError] = useState('')

  const isAdmin = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    const res = await fetch(`/api/checkouts?${params}`)
    const data = await res.json()
    setCheckouts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [status])

  async function handleReturn(id: string) {
    if (armedId !== id) {
      setArmedId(id)
      setTimeout(() => setArmedId((cur) => (cur === id ? null : cur)), 3000)
      return
    }
    setArmedId(null)
    setReturnError('')
    setReturning(id)
    const res = await fetch(`/api/checkouts/${id}/return`, { method: 'POST' })
    setReturning(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setReturnError(d.error || 'Failed to return tool')
      return
    }
    load()
  }

  async function handleAdminAction(id: string, action: 'confirm' | 'reject') {
    setAdminAction({ id, action })
    setReturnError('')
    const res = await fetch(`/api/checkouts/${id}/confirm-return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setAdminAction(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setReturnError(d.error || 'Failed')
      return
    }
    load()
  }

  const filtered = checkouts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.tool.name.toLowerCase().includes(q) ||
      c.user.name.toLowerCase().includes(q) ||
      c.project?.name.toLowerCase().includes(q)
    )
  })

  const pending = filtered.filter((c) => c.status === 'PENDING_RETURN')
  const active = filtered.filter((c) => c.status === 'ACTIVE')
  const returned = filtered.filter((c) => c.status === 'RETURNED')
  const consumed = filtered.filter((c) => c.status === 'CONSUMED')

  const filterTabs = ['ALL', 'ACTIVE', 'PENDING_RETURN', 'RETURNED', 'CONSUMED'] as const

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('checkoutHistory')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin ? t('allCheckouts') : t('yourCheckouts')}
        </p>
      </div>

      {returnError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{returnError}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t('search') + '…'} value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {filterTabs.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                status === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'
              }`}>
              {s === 'ALL' ? t('all')
                : s === 'ACTIVE' ? t('active')
                : s === 'PENDING_RETURN' ? t('pendingReturn')
                : s === 'RETURNED' ? t('returned')
                : t('consumed')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {(status === 'ALL' || status === 'PENDING_RETURN') && pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                {t('pendingReturns')} ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((c) => (
                  <CheckoutRow key={c.id} checkout={c} onReturn={handleReturn} onAdminAction={handleAdminAction}
                    returning={returning === c.id} armed={armedId === c.id}
                    adminAction={adminAction?.id === c.id ? adminAction.action : null}
                    session={session} isAdmin={isAdmin} t={t} />
                ))}
              </div>
            </div>
          )}

          {(status === 'ALL' || status === 'ACTIVE') && active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('active')} ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map((c) => (
                  <CheckoutRow key={c.id} checkout={c} onReturn={handleReturn} onAdminAction={handleAdminAction}
                    returning={returning === c.id} armed={armedId === c.id}
                    adminAction={null}
                    session={session} isAdmin={isAdmin} t={t} />
                ))}
              </div>
            </div>
          )}

          {(status === 'ALL' || status === 'RETURNED') && returned.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('returned')} ({returned.length})
              </h2>
              <div className="space-y-3">
                {returned.map((c) => (
                  <CheckoutRow key={c.id} checkout={c} onReturn={handleReturn} onAdminAction={handleAdminAction}
                    returning={false} armed={false} adminAction={null}
                    session={session} isAdmin={isAdmin} t={t} />
                ))}
              </div>
            </div>
          )}

          {(status === 'ALL' || status === 'CONSUMED') && consumed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('consumed')} ({consumed.length})
              </h2>
              <div className="space-y-3">
                {consumed.map((c) => (
                  <CheckoutRow key={c.id} checkout={c} onReturn={handleReturn} onAdminAction={handleAdminAction}
                    returning={false} armed={false} adminAction={null}
                    session={session} isAdmin={isAdmin} t={t} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">{t('noCheckouts')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CheckoutRow({ checkout: c, onReturn, onAdminAction, returning, armed, adminAction, session, isAdmin, t }: {
  checkout: Checkout
  onReturn: (id: string) => void
  onAdminAction: (id: string, action: 'confirm' | 'reject') => void
  returning: boolean
  armed: boolean
  adminAction: 'confirm' | 'reject' | null
  session: any
  isAdmin: boolean
  t: (key: any) => string
}) {
  const isOwn = session?.user?.id === c.user.id
  const canReturn = c.status === 'ACTIVE' && (isOwn || isAdmin)
  const isPending = c.status === 'PENDING_RETURN'
  const mins = c.status === 'ACTIVE' || c.status === 'PENDING_RETURN'
    ? Math.floor((Date.now() - new Date(c.checkoutDate).getTime()) / 60000)
    : null

  return (
    <div className={`bg-white rounded-2xl border p-4 ${
      isPending ? 'border-amber-200 bg-amber-50/30' : c.status === 'ACTIVE' ? 'border-amber-100' : 'border-gray-100'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
          isPending ? 'bg-amber-100' : c.status === 'ACTIVE' ? 'bg-amber-50' : c.status === 'CONSUMED' ? 'bg-purple-50' : 'bg-gray-50'
        }`}>
          {c.tool.imageUrl
            ? <img src={c.tool.imageUrl} alt={c.tool.name} className="w-full h-full object-cover" />
            : <Wrench size={16} className={isPending ? 'text-amber-500' : c.status === 'ACTIVE' ? 'text-amber-400' : c.status === 'CONSUMED' ? 'text-purple-400' : 'text-gray-400'} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{c.tool.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {isAdmin && (
                  <span className="flex items-center gap-1 text-xs text-gray-500"><User size={11} />{c.user.name}</span>
                )}
                {c.project && (
                  <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={11} />{c.project.name}</span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} />{format(new Date(c.checkoutDate), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {isPending ? (
                <>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    {t('pendingReturn')}
                  </span>
                  {isAdmin ? (
                    <div className="flex gap-1.5">
                      <button onClick={() => onAdminAction(c.id, 'confirm')}
                        disabled={adminAction !== null}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-60 transition-colors whitespace-nowrap">
                        <Check size={12} /> {adminAction === 'confirm' ? t('confirming') : t('confirmReturn')}
                      </button>
                      <button onClick={() => onAdminAction(c.id, 'reject')}
                        disabled={adminAction !== null}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-60 transition-colors whitespace-nowrap">
                        <X size={12} /> {adminAction === 'reject' ? '…' : t('rejectReturn')}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 italic">{t('awaitingApproval')}</span>
                  )}
                </>
              ) : c.status === 'ACTIVE' ? (
                <>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    {mins !== null ? formatMinutes(mins) : t('active')}
                  </span>
                  {canReturn && (
                    <button onClick={() => onReturn(c.id)} disabled={returning}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap ${
                        armed ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-50 hover:bg-green-100 text-green-700'
                      }`}>
                      <CornerDownLeft size={12} /> {returning ? '…' : armed ? t('confirmQuestion') : t('returnTool')}
                    </button>
                  )}
                </>
              ) : c.status === 'CONSUMED' ? (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  {t('consumed')} ({c.quantity}x)
                </span>
              ) : (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  {c.durationMins ? formatMinutes(c.durationMins) : t('returned')}
                </span>
              )}
            </div>
          </div>
          {c.status === 'RETURNED' && c.returnDate && (
            <p className="text-xs text-gray-400 mt-1">
              {t('returnedLabel')}: {format(new Date(c.returnDate), 'MMM d, HH:mm')}
            </p>
          )}
          {c.notes && <p className="text-xs text-gray-400 mt-1 italic">{c.notes}</p>}
        </div>
      </div>
    </div>
  )
}
