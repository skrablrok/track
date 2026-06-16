'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle,
  User, MapPin, Calendar, Wrench, AlertTriangle, Package,
} from 'lucide-react'

type RequestDetail = {
  id: string
  status: string
  notes?: string
  adminNotes?: string
  createdAt: string
  updatedAt: string
  requester: { id: string; name: string; email: string; role: string }
  project?: { id: string; name: string; location?: string }
  items: Array<{
    id: string
    requestedQty: number
    approvedQty: number | null
    notes?: string
    itemName?: string | null
    procurementStatus?: string | null
    tool: { id: string; name: string; imageUrl?: string; category?: string; currentStock: number; minStock: number; totalStock: number } | null
  }>
}

const STATUS_CONFIG = {
  PENDING:            { label: 'Pending Review',     color: 'bg-amber-100 text-amber-800 border-amber-200',  icon: Clock },
  APPROVED:           { label: 'Approved',           color: 'bg-green-100 text-green-800 border-green-200',  icon: CheckCircle2 },
  PARTIALLY_APPROVED: { label: 'Partially Approved', color: 'bg-blue-100 text-blue-800 border-blue-200',     icon: AlertCircle },
  REJECTED:           { label: 'Rejected',           color: 'bg-red-100 text-red-800 border-red-200',        icon: XCircle },
}

const PROCUREMENT_BADGE: Record<string, { label: string; color: string }> = {
  PENDING_PURCHASE: { label: 'Pending Purchase', color: 'bg-amber-100 text-amber-700' },
  ORDERED:          { label: 'Ordered',          color: 'bg-blue-100 text-blue-700' },
  RECEIVED:         { label: 'Received',         color: 'bg-purple-100 text-purple-700' },
  COMPLETED:        { label: 'Completed',        color: 'bg-green-100 text-green-700' },
}

export default function RequestDetailPage() {
  const { id } = useParams() as { id: string }
  const { data: session } = useSession()
  const router = useRouter()
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<Record<string, number>>({})
  const [adminNotes, setAdminNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const isPrivileged = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')

  useEffect(() => {
    fetch(`/api/requests/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRequest(data)
        // Pre-fill approvals with requested quantities
        const init: Record<string, number> = {}
        data.items?.forEach((item: any) => {
          init[item.id] = item.requestedQty
        })
        setApprovals(init)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function handleReview(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/requests/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminNotes,
          items: request!.items.map((item) => ({
            requestItemId: item.id,
            toolId: item.tool?.id ?? null,
            approvedQty: approvals[item.id] ?? 0,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setWarnings(data.stockWarnings || [])
      setDone(true)
      setRequest(data.request)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function rejectAll() {
    const zero: Record<string, number> = {}
    request?.items.forEach((i) => { zero[i.id] = 0 })
    setApprovals(zero)
  }

  function approveAll() {
    const full: Record<string, number> = {}
    request?.items.forEach((i) => { full[i.id] = i.requestedQty })
    setApprovals(full)
  }

  if (loading) return <div className="animate-pulse bg-white rounded-2xl h-64 border border-gray-100" />
  if (!request) return <div className="text-center py-16 text-gray-400">Request not found</div>

  const cfg = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING
  const StatusIcon = cfg.icon
  const isPending = request.status === 'PENDING'

  return (
    <div className="max-w-2xl mx-auto space-y-5 fade-in">
      <div className="flex items-center gap-3">
        <Link href="/requests" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request Details</h1>
          <p className="text-sm text-gray-500 font-mono">#{id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {done && warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="font-semibold text-amber-800 text-sm">Stock Replenishment Needed</p>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {done && !warnings.length && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <p className="text-green-800 text-sm font-medium">Request reviewed successfully. The requester has been notified.</p>
        </div>
      )}

      {/* Status header */}
      <div className={`flex items-center gap-3 border rounded-2xl p-4 ${cfg.color}`}>
        <StatusIcon size={20} />
        <div>
          <p className="font-semibold text-sm">{cfg.label}</p>
          <p className="text-xs opacity-75">
            Submitted {format(new Date(request.createdAt), 'MMMM d, yyyy · HH:mm')}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User size={15} className="text-gray-400" />
          <span className="font-medium">{request.requester.name}</span>
          <span className="text-gray-400 text-xs">({request.requester.role})</span>
        </div>
        {request.project && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin size={15} className="text-gray-400" />
            <span>{request.project.name}</span>
            {request.project.location && <span className="text-gray-400 text-xs">· {request.project.location}</span>}
          </div>
        )}
        {request.notes && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 italic">
            "{request.notes}"
          </div>
        )}
        {request.adminNotes && !isPending && (
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            <span className="font-medium">Admin note:</span> {request.adminNotes}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Requested Items</h2>

        {isPrivileged && isPending && (
          <div className="flex gap-2">
            <button type="button" onClick={approveAll}
              className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
              Approve All
            </button>
            <button type="button" onClick={rejectAll}
              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
              Reject All
            </button>
          </div>
        )}

        <div className="space-y-3">
          {request.items.map((item) => {
            const isCustom = !item.tool
            const isNeg = !isCustom && item.tool!.currentStock < 0
            const isLow = !isCustom && item.tool!.currentStock >= 0 && item.tool!.currentStock <= item.tool!.minStock
            const approved = approvals[item.id] ?? item.requestedQty
            const wouldGoNeg = !isCustom && item.tool!.currentStock - approved < 0

            return (
              <div
                key={item.id}
                className={`border rounded-xl p-3 ${isCustom ? 'border-purple-200 bg-purple-50/30' : wouldGoNeg && isPending ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {isCustom
                      ? <AlertTriangle size={16} className="text-purple-400" />
                      : item.tool!.imageUrl
                        ? <img src={item.tool!.imageUrl} alt={item.tool!.name} className="w-full h-full object-cover" />
                        : <Wrench size={16} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">{isCustom ? item.itemName : item.tool!.name}</p>
                      {isCustom && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Not in inventory
                        </span>
                      )}
                      {item.procurementStatus && PROCUREMENT_BADGE[item.procurementStatus] && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROCUREMENT_BADGE[item.procurementStatus].color}`}>
                          {PROCUREMENT_BADGE[item.procurementStatus].label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">Requested: <strong>{item.requestedQty}</strong></span>
                      {!isPending && item.approvedQty !== null && (
                        <span className={`text-xs font-medium ${item.approvedQty === 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Approved: {item.approvedQty}
                        </span>
                      )}
                      {!isCustom && (
                        <span className={`text-xs ${isNeg ? 'text-red-600 font-medium' : isLow ? 'text-amber-600' : 'text-gray-400'}`}>
                          {isNeg ? `Stock: ${item.tool!.currentStock} (NEGATIVE)` : `${item.tool!.currentStock}/${item.tool!.totalStock} in stock`}
                        </span>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{item.notes}"</p>}
                    {isCustom && (
                      <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> Needs to be sourced — not currently tracked in inventory
                      </p>
                    )}
                    {wouldGoNeg && isPending && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> Approving this quantity will put stock below zero — reorder needed
                      </p>
                    )}
                  </div>

                  {isPrivileged && isPending && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <label className="text-xs text-gray-500">Approve qty</label>
                      <input
                        type="number"
                        min={0}
                        max={item.requestedQty}
                        value={approved}
                        onChange={(e) => setApprovals((a) => ({ ...a, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className={`w-20 px-2 py-1.5 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 ${
                          approved === 0 ? 'border-red-200 bg-red-50 focus:ring-red-400'
                          : approved < item.requestedQty ? 'border-amber-200 bg-amber-50 focus:ring-amber-400'
                          : 'border-green-200 bg-green-50 focus:ring-green-400'
                        }`}
                      />
                      <span className="text-xs text-gray-400">of {item.requestedQty}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isPrivileged && isPending && (
        <form onSubmit={handleReview} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Review Decision</h2>
          {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Notes (visible to requester)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Reason for partial approval, expected delivery date, instructions…"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { rejectAll(); setTimeout(() => (document.getElementById('review-form') as HTMLFormElement)?.requestSubmit(), 50) }}
              disabled={submitting}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-semibold transition-colors border border-red-200 disabled:opacity-50"
            >
              Reject All
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {!isPending && (
        <Link href="/requests" className="block text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Back to Requests
        </Link>
      )}
    </div>
  )
}
