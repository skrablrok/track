'use client'

import { useEffect, useState } from 'react'
import { FolderOpen, Plus, MapPin, X, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Project = {
  id: string
  name: string
  location?: string
  description?: string
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD'
  foreman?: { id: string; name: string } | null
  _count: { checkouts: number }
}

type UserOption = { id: string; name: string; role: string }

export default function ProjectsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', description: '', foremanId: '' })
  const [users, setUsers] = useState<UserOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function openForm() {
    setShowForm(true)
    if (users.length === 0) {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          location: form.location,
          description: form.description,
          foremanId: form.foremanId || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setForm({ name: '', location: '', description: '', foremanId: '' })
      setShowForm(false)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const statusConfig = {
    ACTIVE:    { label: t('active'),    color: 'bg-green-100 text-green-700' },
    COMPLETED: { label: t('completed'), color: 'bg-blue-100 text-blue-700' },
    ON_HOLD:   { label: t('onHold'),    color: 'bg-amber-100 text-amber-700' },
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('projects')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('sitesAndAssignments')}</p>
        </div>
        {isAdmin && (
          <button onClick={openForm}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} /> {t('newProject')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">{t('createProject')}</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-3">
            <input required placeholder={t('projectName')} value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            <input placeholder={t('locationAddress')} value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            <textarea placeholder={t('descriptionOpt')} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('projectLeader')}</label>
              <select value={form.foremanId}
                onChange={(e) => setForm((f) => ({ ...f, foremanId: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                <option value="">{t('selectLeader')}</option>
                {users.filter((u) => u.role === 'FOREMAN').map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
                {users.filter((u) => u.role !== 'FOREMAN').length > 0 && users.filter((u) => u.role === 'FOREMAN').length > 0 && (
                  <option disabled>──────────</option>
                )}
                {users.filter((u) => u.role !== 'FOREMAN').map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role.toLowerCase()})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? t('creating') : t('create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{t('noProjects')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const s = statusConfig[project.status]
            return (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm hover:border-blue-100 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <FolderOpen size={18} className="text-blue-500" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{project.name}</h3>
                {project.location && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <MapPin size={12} />{project.location}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs mt-1.5">
                  <User size={12} className="text-gray-400 flex-shrink-0" />
                  {project.foreman
                    ? <span className="font-medium text-gray-700">{project.foreman.name}</span>
                    : <span className="text-gray-400 italic">{t('noLeader')}</span>
                  }
                </div>
                {project.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{project.description}</p>
                )}
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {project._count.checkouts} {t('activeCheckoutsCount')}
                  </span>
                  <Link href={`/checkouts?projectId=${project.id}`} className="text-xs text-blue-600 hover:underline">
                    {t('view')}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
