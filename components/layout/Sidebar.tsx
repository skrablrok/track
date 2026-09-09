'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Wrench, QrCode, ClipboardList,
  FolderOpen, BarChart3, Users, LogOut, ClipboardCheck, ShoppingCart, FileSpreadsheet, Building2, Receipt,
  ChevronDown,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import NotificationPrefsMenu from '@/components/NotificationPrefsMenu'

type Counts = { tools: number; checkouts: number; requests: number }

export default function Sidebar({ role, orgName, userName, counts }: { role: string; orgName?: string; userName?: string | null; counts?: Counts }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const groups: { labelKey: 'navGroupMain' | 'navGroupWarehouse' | 'navGroupProcurement' | 'navGroupSystem'; links: Array<{ href: string; key: any; icon: any; roles: string[]; badge?: number }> }[] = [
    {
      labelKey: 'navGroupMain',
      links: [
        { href: '/dashboard', key: 'nav_dashboard', icon: LayoutDashboard, roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
        { href: '/scan',      key: 'nav_scan',      icon: QrCode,          roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
        { href: '/reports',   key: 'nav_reports',   icon: BarChart3,       roles: ['ADMIN','MANAGER'] },
      ],
    },
    {
      labelKey: 'navGroupWarehouse',
      links: [
        { href: '/tools',     key: 'nav_tools',     icon: Wrench,         roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'], badge: counts?.tools },
        { href: '/checkouts', key: 'nav_checkouts', icon: ClipboardList,  roles: ['ADMIN','MANAGER','EMPLOYEE'], badge: counts?.checkouts },
        { href: '/requests',  key: 'nav_requests',  icon: ClipboardCheck, roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'], badge: counts?.requests },
        { href: '/projects',  key: 'nav_projects',  icon: FolderOpen,     roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
      ],
    },
    {
      labelKey: 'navGroupProcurement',
      links: [
        { href: '/purchases',         key: 'nav_purchases',   icon: Receipt,      roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
        { href: '/admin/procurement', key: 'nav_procurement', icon: ShoppingCart, roles: ['ADMIN','MANAGER'] },
      ],
    },
    {
      labelKey: 'navGroupSystem',
      links: [
        { href: '/admin/import', key: 'nav_import', icon: FileSpreadsheet, roles: ['ADMIN','MANAGER'] },
        { href: '/admin/users',  key: 'nav_users',   icon: Users,          roles: ['ADMIN'] },
      ],
    },
  ]

  const displayName = userName || 'User'

  return (
    <aside className="hidden md:flex flex-col w-64 bg-zinc-900 h-screen flex-shrink-0">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white text-base leading-tight truncate">{orgName || 'BuildFlow'}</span>
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-5">
        {groups.map((group) => {
          const allowed = group.links.filter((l) => l.roles.includes(role))
          if (allowed.length === 0) return null
          return (
            <div key={group.labelKey}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t(group.labelKey)}
              </p>
              <div className="space-y-0.5">
                {allowed.map(({ href, key, icon: Icon, badge }) => {
                  const active = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        active ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      )}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="flex-1 truncate">{t(key)}</span>
                      {typeof badge === 'number' && badge > 0 && (
                        <span className={cn(
                          'text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                          active ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        )}>
                          {badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div ref={userRef} className="relative px-3 py-3 border-t border-zinc-800">
        {userOpen && (
          <div className="absolute left-3 right-3 bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden">
            <NotificationPrefsMenu />
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              {t('nav_signOut')}
            </button>
          </div>
        )}
        <button
          onClick={() => setUserOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-zinc-800 transition-colors"
        >
          <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium text-white leading-tight truncate">{displayName}</p>
            <p className="text-xs text-zinc-500 truncate">{orgName || 'BuildFlow'}</p>
          </div>
          <ChevronDown size={15} className="text-zinc-500 flex-shrink-0" />
        </button>
        <a
          href="https://skrablweb.si"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors pt-2"
        >
          BuildFlow by SKRABLWEB
        </a>
      </div>
    </aside>
  )
}
