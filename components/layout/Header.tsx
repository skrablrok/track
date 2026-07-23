'use client'

import { Bell, ChevronDown, X, CheckCheck, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LANGUAGES, type Lang } from '@/lib/i18n/translations'
import InstallButton from '@/components/InstallButton'

interface Props {
  user: { name?: string | null; email?: string | null; role: string }
  orgName?: string
}

type Notification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  linkUrl?: string
  createdAt: string
}

const roleBadge: Record<string, string> = {
  ADMIN:    'bg-red-100 text-red-700',
  MANAGER:  'bg-amber-100 text-amber-700',
  EMPLOYEE: 'bg-blue-100 text-blue-700',
  FOREMAN:  'bg-purple-100 text-purple-700',
}

const notifIcon = (type: string) => {
  if (type.includes('STOCK')) return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
  if (type.includes('APPROVED')) return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
  if (type.includes('REJECTED')) return <X size={14} className="text-red-500 flex-shrink-0" />
  return <Info size={14} className="text-blue-500 flex-shrink-0" />
}

export default function Header({ user, orgName }: Props) {
  const { t, lang, setLang } = useLanguage()
  const [userOpen, setUserOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchCount() {
    try {
      const res = await fetch('/api/notifications/count')
      const data = await res.json()
      setUnreadCount(data.count || 0)
    } catch {}
  }

  async function openBell() {
    setBellOpen((v) => !v)
    if (!bellOpen) {
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : [])
      } catch {}
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const roleLabel = user.role === 'FOREMAN' ? t('roleSiteSupervisor') : user.role

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="md:hidden flex flex-col leading-tight">
        <span className="text-base font-bold text-gray-900 truncate max-w-[180px]">{orgName || 'BuildFlow'}</span>
        <a href="https://skrablweb.si" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors">
          BuildFlow by SKRABLWEB
        </a>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-1.5">

        <InstallButton />

        {/* Notification Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={openBell}
            className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-600' : 'text-gray-500'}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">{t('notifications')}</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <CheckCheck size={12} /> {t('markAllRead')}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">{t('noNotifications')}</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {notifIcon(n.type)}
                        <div className="flex-1 min-w-0" onClick={() => !n.read && markRead(n.id)}>
                          <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'MMM d, HH:mm')}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                      </div>
                      {n.linkUrl && (
                        <Link href={n.linkUrl} onClick={() => { setBellOpen(false); markRead(n.id) }}
                          className="mt-1.5 text-xs text-blue-600 hover:underline block">
                          {t('view')} →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-tight">{user.name}</p>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${roleBadge[user.role] || 'bg-gray-100 text-gray-600'}`}>
                {roleLabel}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                {t('nav_signOut')}
              </button>
            </div>
          )}
        </div>

        {/* Language Switcher — top-right corner */}
        <div ref={langRef} className="relative ml-1">
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            title="Change language"
          >
            <span className="text-xl leading-none">{LANGUAGES[lang].flag}</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 flex gap-1">
              {(Object.entries(LANGUAGES) as [Lang, { name: string; flag: string }][]).map(([code, info]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); setLangOpen(false) }}
                  title={info.name}
                  className={`text-2xl leading-none p-1.5 rounded-xl transition-all hover:bg-gray-100 ${lang === code ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
                >
                  {info.flag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
