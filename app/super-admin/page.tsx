'use client'

import { useEffect, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Building2, Users, Wrench, FolderOpen, ClipboardList,
  Power, PowerOff, RefreshCw, LogOut, ShieldCheck, Eye, EyeOff,
  Trash2, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'

type Org = {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  _count: { users: number; tools: number; projects: number; requests: number }
}

type Stats = {
  totalOrgs: number
  totalUsers: number
  totalTools: number
  totalRequests: number
  pendingCount: number
}

export default function SuperAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orgs, setOrgs]           = useState<Org[]>([])
  const [stats, setStats]         = useState<Stats | null>(null)
  const [loading, setLoading]     = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [toggling, setToggling]   = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status])

  async function load() {
    setLoading(true)
    setForbidden(false)
    try {
      const res = await fetch('/api/super-admin')
      if (res.status === 403) { setForbidden(true); return }
      const data = await res.json()
      setOrgs(data.orgs)
      setStats(data.stats)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoggingIn(false)
    if (result?.error) setLoginError('Invalid email or password.')
  }

  async function deleteOrg(orgId: string) {
    setDeleting(orgId)
    const res = await fetch(`/api/super-admin/${orgId}`, { method: 'DELETE' })
    if (res.ok) {
      setOrgs((prev) => prev.filter((o) => o.id !== orgId))
      setStats((prev) => prev ? { ...prev, totalOrgs: prev.totalOrgs - 1, pendingCount: prev.pendingCount - 1 } : prev)
    }
    setDeleting(null)
  }

  async function toggleOrg(orgId: string, active: boolean) {
    setToggling(orgId)
    try {
      const res = await fetch('/api/super-admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, active }),
      })
      if (res.ok) {
        setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, active } : o))
        setStats((prev) => prev ? { ...prev, pendingCount: active ? prev.pendingCount - 1 : prev.pendingCount + 1 } : prev)
      }
    } finally {
      setToggling(null)
    }
  }

  if (status === 'unauthenticated' || (status === 'authenticated' && forbidden)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
            <p className="text-sm text-gray-500 mt-1">BuildFlow platform management</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{loginError}</p>}
            <button type="submit" disabled={loggingIn} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  const pendingOrgs = orgs.filter((o) => !o.active)
  const activeOrgs  = orgs.filter((o) => o.active)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">BuildFlow Super Admin</h1>
              <p className="text-xs text-gray-400 truncate hidden sm:block">{session?.user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={load} className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCw size={11} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={() => signOut({ callbackUrl: '/super-admin' })} className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              <LogOut size={11} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: 'Organizations',    value: stats.totalOrgs,     icon: Building2,     color: 'blue'    },
              { label: 'Pending',          value: stats.pendingCount,  icon: ClipboardList, color: 'amber'   },
              { label: 'Users',            value: stats.totalUsers,    icon: Users,         color: 'violet'  },
              { label: 'Tools',            value: stats.totalTools,    icon: Wrench,        color: 'emerald' },
              { label: 'Requests',         value: stats.totalRequests, icon: FolderOpen,    color: 'rose'    },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 bg-${color}-50`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pending approvals */}
        {pendingOrgs.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Pending Approval ({pendingOrgs.length})
            </h2>
            <div className="space-y-3">
              {pendingOrgs.map((org) => (
                <OrgCard key={org.id} org={org} toggling={toggling} deleting={deleting}
                  onToggle={toggleOrg} onDelete={deleteOrg} onView={(id) => router.push(`/super-admin/${id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Active organizations */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Active Organizations ({activeOrgs.length})
          </h2>
          {activeOrgs.length === 0 ? (
            <p className="text-sm text-gray-400">No active organizations yet.</p>
          ) : (
            <div className="space-y-3">
              {activeOrgs.map((org) => (
                <OrgCard key={org.id} org={org} toggling={toggling} deleting={deleting}
                  onToggle={toggleOrg} onDelete={deleteOrg} onView={(id) => router.push(`/super-admin/${id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function OrgCard({ org, toggling, deleting, onToggle, onDelete, onView }: {
  org: Org
  toggling: string | null
  deleting: string | null
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
}) {
  const busy = toggling === org.id || deleting === org.id
  return (
    <div className={`bg-white rounded-2xl border ${org.active ? 'border-gray-100' : 'border-amber-200 bg-amber-50/40'}`}>
      {/* Top: name + chevron */}
      <button onClick={() => onView(org.id)} className="w-full text-left px-4 sm:px-5 pt-4 sm:pt-5 pb-2 hover:opacity-80 transition-opacity">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{org.name}</h3>
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">/{org.slug}</span>
              {!org.active && <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Users size={11} /> {org._count.users}</span>
              <span className="flex items-center gap-1"><Wrench size={11} /> {org._count.tools}</span>
              <span className="flex items-center gap-1"><FolderOpen size={11} /> {org._count.projects}</span>
              <span className="flex items-center gap-1"><ClipboardList size={11} /> {org._count.requests}</span>
              <span className="text-gray-400">{format(new Date(org.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
        </div>
      </button>

      {/* Bottom: action buttons */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 flex gap-2 flex-wrap">
        <button
          onClick={() => onToggle(org.id, !org.active)}
          disabled={busy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors disabled:opacity-50 ${
            org.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
          }`}
        >
          {org.active ? <><PowerOff size={13} /> Suspend</> : <><Power size={13} /> Activate</>}
        </button>
        {!org.active && (
          <button
            onClick={() => onDelete(org.id)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} /> Reject
          </button>
        )}
      </div>
    </div>
  )
}
