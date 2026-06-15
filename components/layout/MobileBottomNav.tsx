'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Wrench, QrCode, ClipboardCheck,
  FolderOpen, ClipboardList, BarChart3, Users, MoreHorizontal, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const ALL_LINKS = [
  { href: '/dashboard',   key: 'nav_dashboard', icon: LayoutDashboard, roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
  { href: '/tools',       key: 'nav_tools',     icon: Wrench,          roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
  { href: '/scan',        key: 'nav_scan',      icon: QrCode,          roles: ['ADMIN','MANAGER','EMPLOYEE'] },
  { href: '/requests',    key: 'nav_requests',  icon: ClipboardCheck,  roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
  { href: '/projects',    key: 'nav_projects',  icon: FolderOpen,      roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
  { href: '/checkouts',   key: 'nav_checkouts', icon: ClipboardList,   roles: ['ADMIN','MANAGER','EMPLOYEE'] },
  { href: '/reports',     key: 'nav_reports',   icon: BarChart3,       roles: ['ADMIN','MANAGER'] },
  { href: '/admin/users', key: 'nav_users',     icon: Users,           roles: ['ADMIN'] },
] as const

export default function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [moreOpen, setMoreOpen] = useState(false)

  const allowed = ALL_LINKS.filter((l) => (l.roles as readonly string[]).includes(role))
  const primary = allowed.slice(0, 4)
  const overflow = allowed.slice(4)
  const hasMore = overflow.length > 0

  const isOverflowActive = overflow.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + '/')
  )

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More sheet */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-xl rounded-t-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">More</span>
            <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {overflow.map(({ href, key, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors',
                    active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  <Icon size={22} />
                  <span className="truncate w-full text-center">{t(key)}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="flex">
          {primary.map(({ href, key, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const isScan = href === '/scan'
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                  active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {isScan ? (
                  <span className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center -mt-5 shadow-lg border-4 border-white">
                    <Icon size={18} className="text-white" />
                  </span>
                ) : (
                  <Icon size={20} />
                )}
                {!isScan && <span className="truncate max-w-[56px] text-center">{t(key)}</span>}
              </Link>
            )
          })}

          {hasMore && (
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isOverflowActive || moreOpen ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <MoreHorizontal size={20} />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
