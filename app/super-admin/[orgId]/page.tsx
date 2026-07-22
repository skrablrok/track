'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft, Building2, Users, Wrench, FolderOpen, ClipboardList,
  Power, PowerOff, Trash2, User, CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { format } from 'date-fns'

type OrgDetail = {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  users: { id: string; name: string; email: string; role: string; active: boolean; createdAt: string }[]
  tools: { id: string; name: string; category: string | null; type: string; currentStock: number; totalStock: number; active: boolean }[]
  projects: { id: string; name: string; location: string | null; status: string; createdAt: string }[]
  requests: { id: string; status: string; createdAt: string; requester: { name: string }; _count: { items: number } }[]
  _count: { users: number; tools: number; projects: number; requests: number; checkouts: number }
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'text-green-700 bg-green-50',
  PENDING: 'text-amber-700 bg-amber-50',
  REJECTED: 'text-red-700 bg-red-50',
  PARTIALLY_APPROVED: 'text-blue-700 bg-blue-50',
}

const PROJECT_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-700 bg-green-50',
  COMPLETED: 'text-gray-600 bg-gray-100',
  ON_HOLD: 'text-amber-700 bg-amber-50',
}

export default function OrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const router = useRouter()
  const { status } = useSession()
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<'delete' | null>(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/super-admin')
    if (status === 'authenticated') load()
  }, [status])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/super-admin/${orgId}`)
    if (!res.ok) { setError('Failed to load organization'); setLoading(false); return }
    setOrg(await res.json())
    setLoading(false)
  }

  async function toggleActive() {
    if (!org) return
    setActing(true)
    const res = await fetch('/api/super-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: org.id, active: !org.active }),
    })
    if (res.ok) setOrg((o) => o ? { ...o, active: !o.active } : o)
    setActing(false)
  }

  async function deleteOrg() {
    setActing(true)
    const res = await fetch(`/api/super-admin/${orgId}`, { method: 'DELETE' })
    if (res.ok) router.replace('/super-admin')
    else setActing(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-28" />
        ))}
      </div>
    </div>
  )

  if (error || !org) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">{error || 'Organization not found'}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{org.name}</h1>
                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-lg">/{org.slug}</span>
                {org.active
                  ? <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                  : <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
                }
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Registered {format(new Date(org.createdAt), 'MMMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleActive}
              disabled={acting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                org.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
              }`}
            >
              {org.active ? <><PowerOff size={14} /> Suspend</> : <><Power size={14} /> Activate</>}
            </button>
            <button
              onClick={() => setConfirming('delete')}
              disabled={acting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} /> Reject & Delete
            </button>
          </div>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirming === 'delete' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-base font-bold text-gray-900 mb-2">Reject & delete organization?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <strong>{org.name}</strong> and all its data (users, tools, projects). This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={deleteOrg}
                disabled={acting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {acting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Users',     value: org._count.users,     icon: Users },
            { label: 'Tools',     value: org._count.tools,     icon: Wrench },
            { label: 'Projects',  value: org._count.projects,  icon: FolderOpen },
            { label: 'Requests',  value: org._count.requests,  icon: ClipboardList },
            { label: 'Checkouts', value: org._count.checkouts, icon: Building2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <Icon size={18} className="text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Users */}
        <section className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Users ({org.users.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {org.users.map((u) => (
              <div key={u.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.name || '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{u.role}</span>
                  {u.active
                    ? <CheckCircle size={14} className="text-green-500" />
                    : <XCircle size={14} className="text-red-400" />
                  }
                </div>
              </div>
            ))}
            {org.users.length === 0 && <p className="px-6 py-4 text-sm text-gray-400">No users</p>}
          </div>
        </section>

        {/* Projects */}
        <section className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <FolderOpen size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Projects ({org.projects.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {org.projects.map((p) => (
              <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  {p.location && <p className="text-xs text-gray-400">{p.location}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_COLORS[p.status] || 'text-gray-600 bg-gray-100'}`}>
                  {p.status}
                </span>
              </div>
            ))}
            {org.projects.length === 0 && <p className="px-6 py-4 text-sm text-gray-400">No projects</p>}
          </div>
        </section>

        {/* Tools */}
        <section className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Wrench size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Tools & Materials ({org.tools.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {org.tools.map((t) => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.category || t.type}</p>
                </div>
                <span className="text-xs text-gray-600">
                  {t.currentStock} / {t.totalStock} in stock
                </span>
              </div>
            ))}
            {org.tools.length === 0 && <p className="px-6 py-4 text-sm text-gray-400">No tools added</p>}
          </div>
        </section>

        {/* Recent requests */}
        <section className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Recent Requests</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {org.requests.map((r) => (
              <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.requester.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} /> {format(new Date(r.createdAt), 'MMM d, yyyy')} · {r._count.items} items
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'text-gray-600 bg-gray-100'}`}>
                  {r.status}
                </span>
              </div>
            ))}
            {org.requests.length === 0 && <p className="px-6 py-4 text-sm text-gray-400">No requests yet</p>}
          </div>
        </section>

      </div>
    </div>
  )
}
