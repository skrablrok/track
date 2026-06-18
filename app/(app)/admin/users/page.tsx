'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, UserCheck, UserX, X, Mail } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type User = {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  setupComplete: boolean
  createdAt: string
}

export default function UsersPage() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'EMPLOYEE' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccessMsg('')
    setInviteUrl('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      const data = await res.json()
      setForm({ email: '', role: 'EMPLOYEE' })
      setShowForm(false)
      if (data.emailSent === false && data.inviteUrl) {
        setInviteUrl(data.inviteUrl)
        setSuccessMsg(t('userCreatedManualShare'))
      } else {
        setSuccessMsg(`${t('inviteSentTo')} ${form.email}`)
      }
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function resendInvite(user: User) {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, role: user.role, resend: true }),
    })
  }

  async function toggleActive(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    })
    load()
  }

  const roleColor: Record<string, string> = {
    ADMIN:    'bg-red-100 text-red-700',
    MANAGER:  'bg-amber-100 text-amber-700',
    EMPLOYEE: 'bg-blue-100 text-blue-700',
    FOREMAN:  'bg-purple-100 text-purple-700',
  }

  function displayName(user: User) {
    return user.name || user.email
  }

  function avatarLetter(user: User) {
    return (user.name?.[0] || user.email[0] || '?').toUpperCase()
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('userManagement')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} {t('usersRegistered')}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(''); setSuccessMsg(''); setInviteUrl('') }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus size={16} /> {t('newUser')}
        </button>
      </div>

      {successMsg && (
        <div className={`border rounded-xl p-3 text-sm ${inviteUrl ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Mail size={15} /> {successMsg}
          </div>
          {inviteUrl && (
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={inviteUrl}
                className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-700 focus:outline-none" />
              <button onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                {t('copy')}
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">{t('inviteUser')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('inviteUserDesc')}</p>
            </div>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              type="email"
              placeholder={t('emailReq')}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="EMPLOYEE">{t('roleEmployee')}</option>
              <option value="FOREMAN">{t('roleForeman')}</option>
              <option value="MANAGER">{t('roleManager')}</option>
              <option value="ADMIN">{t('roleAdmin')}</option>
            </select>
            <div className="sm:col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                <Mail size={14} />
                {saving ? t('sending') : t('sendInvite')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">{t('name')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">{t('email')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">{t('role')}</th>
                <th className="text-center px-5 py-3 font-medium text-gray-600">{t('status')}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={`border-b border-gray-50 ${!user.active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold">
                        {avatarLetter(user)}
                      </div>
                      <span className="font-medium text-gray-900">{displayName(user)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{user.email}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColor[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {!user.setupComplete ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {t('invitePending')}
                      </span>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {user.active ? t('statusActive') : t('statusDisabled')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {user.setupComplete && (
                      <button onClick={() => toggleActive(user)}
                        className="text-xs text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title={user.active ? t('disableUser') : t('enableUser')}>
                        {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
