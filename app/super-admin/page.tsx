'use client'

import { useEffect, useState } from 'react'
import { Building2, Users, Wrench, FolderOpen, ClipboardList, Power, PowerOff, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

type Org = {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  _count: { users: number; tools: number; projects: number; requests: number }
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin')
      if (res.status === 403) { setError('Access denied. This page requires super-admin privileges.'); return }
      const data = await res.json()
      setOrgs(data)
    } catch {
      setError('Failed to load organizations')
    } finally {
      setLoading(false)
    }
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
      }
    } finally {
      setToggling(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center">
          <Building2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-blue-600" />
              Super Admin — All Organizations
            </h1>
            <p className="text-sm text-gray-500 mt-1">{orgs.length} organizations registered</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {orgs.map((org) => (
              <div key={org.id} className={`bg-white rounded-2xl border p-6 flex items-center justify-between gap-6 ${org.active ? 'border-gray-100' : 'border-red-100 bg-red-50/30'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-semibold text-gray-900 truncate">{org.name}</h2>
                    <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-lg">/{org.slug}</span>
                    {!org.active && (
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Suspended</span>
                    )}
                  </div>
                  <div className="flex items-center gap-5 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Users size={13} /> {org._count.users} users</span>
                    <span className="flex items-center gap-1.5"><Wrench size={13} /> {org._count.tools} tools</span>
                    <span className="flex items-center gap-1.5"><FolderOpen size={13} /> {org._count.projects} projects</span>
                    <span className="flex items-center gap-1.5"><ClipboardList size={13} /> {org._count.requests} requests</span>
                    <span className="text-xs text-gray-400">Registered {format(new Date(org.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleOrg(org.id, !org.active)}
                  disabled={toggling === org.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    org.active
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'border border-green-200 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {org.active ? <><PowerOff size={14} /> Suspend</> : <><Power size={14} /> Activate</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
