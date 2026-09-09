'use client'

import { Bell, ChevronDown, X, CheckCheck, AlertTriangle, CheckCircle2, Info, Receipt, Search, Wrench, Package } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LANGUAGES, type Lang } from '@/lib/i18n/translations'
import { shortCode } from '@/lib/utils'
import InstallButton from '@/components/InstallButton'
import NotificationPrefsMenu from '@/components/NotificationPrefsMenu'

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

type SearchResult = { id: string; name: string; type?: string; category?: string | null }

const notifIcon = (type: string) => {
  if (type.includes('STOCK')) return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
  if (type.includes('APPROVED')) return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
  if (type.includes('REJECTED')) return <X size={14} className="text-red-500 flex-shrink-0" />
  if (type.includes('PURCHASE')) return <Receipt size={14} className="text-purple-500 flex-shrink-0" />
  return <Info size={14} className="text-blue-500 flex-shrink-0" />
}

export default function Header({ user, orgName }: Props) {
  const { t, lang, setLang } = useLanguage()
  const router = useRouter()
  const [userOpen, setUserOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        searchInputRef.current?.blur()
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tools?search=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data.slice(0, 8) : [])
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  function goToResult(id: string) {
    setSearchOpen(false)
    setMobileSearchOpen(false)
    setQuery('')
    router.push(`/tools/${id}`)
  }

  function openMobileSearch() {
    setMobileSearchOpen(true)
    setTimeout(() => mobileSearchInputRef.current?.focus(), 50)
  }

  function closeMobileSearch() {
    setMobileSearchOpen(false)
    setQuery('')
  }

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

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between gap-2 px-3 md:px-6 flex-shrink-0">
      <div className="md:hidden flex flex-col leading-tight min-w-0">
        <span className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[130px] sm:max-w-[180px]">{orgName || 'BuildFlow'}</span>
        <a href="https://skrablweb.si" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors truncate">
          BuildFlow by SKRABLWEB
        </a>
      </div>

      {/* Global search — desktop only */}
      <div ref={searchRef} className="hidden md:block relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-10 pr-16 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded-md px-1.5 py-0.5 pointer-events-none">
          Ctrl K
        </kbd>

        {searchOpen && query.trim() && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">{t('noResults')}</div>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => goToResult(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {r.type === 'MATERIAL' ? <Package size={14} className="text-gray-500" /> : <Wrench size={14} className="text-gray-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">{shortCode(r)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">

        <div className="hidden md:block">
          <InstallButton />
        </div>

        {/* Mobile search trigger */}
        <button
          onClick={openMobileSearch}
          className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
          aria-label={t('searchPlaceholder')}
        >
          <Search className="w-5 h-5" />
        </button>

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

        {/* Language Switcher — desktop only, folded into the account menu on mobile */}
        <div ref={langRef} className="relative hidden md:block">
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

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-1 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </button>

          {userOpen && (
            <div className="fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-64 max-h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>

              {/* Language + install — folded in here on mobile, already standalone on desktop */}
              <div className="md:hidden border-b border-gray-100 px-4 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  {(Object.entries(LANGUAGES) as [Lang, { name: string; flag: string }][]).map(([code, info]) => (
                    <button
                      key={code}
                      onClick={() => setLang(code)}
                      title={info.name}
                      className={`text-xl leading-none p-1.5 rounded-lg transition-all hover:bg-gray-100 ${lang === code ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
                    >
                      {info.flag}
                    </button>
                  ))}
                </div>
                <InstallButton />
              </div>

              <NotificationPrefsMenu />
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                {t('nav_signOut')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile full-width search overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-black/20" onClick={closeMobileSearch}>
          <div className="bg-white border-b border-gray-100 shadow-xl p-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <button onClick={closeMobileSearch} className="p-3 rounded-xl hover:bg-gray-100 text-gray-500 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {query.trim() && (
              <div className="mt-2 max-h-[60vh] overflow-y-auto -mx-3">
                {results.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">{t('noResults')}</div>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => goToResult(r.id)}
                      className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {r.type === 'MATERIAL' ? <Package size={16} className="text-gray-500" /> : <Wrench size={16} className="text-gray-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400">{shortCode(r)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
