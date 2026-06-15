'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wrench, QrCode, ClipboardCheck, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const isForeman = role === 'FOREMAN'

  const employeeLinks = [
    { href: '/dashboard', key: 'nav_dashboard', icon: LayoutDashboard },
    { href: '/tools',     key: 'nav_tools',     icon: Wrench },
    { href: '/scan',      key: 'nav_scan',      icon: QrCode },
    { href: '/requests',  key: 'nav_requests',  icon: ClipboardCheck },
    { href: '/projects',  key: 'nav_projects',  icon: FolderOpen },
  ] as const

  const foremanLinks = [
    { href: '/dashboard', key: 'nav_dashboard', icon: LayoutDashboard },
    { href: '/tools',     key: 'nav_tools',     icon: Wrench },
    { href: '/requests',  key: 'nav_requests',  icon: ClipboardCheck },
    { href: '/projects',  key: 'nav_projects',  icon: FolderOpen },
  ] as const

  const navLinks = isForeman ? foremanLinks : employeeLinks

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="flex">
        {navLinks.map(({ href, key, icon: Icon }) => {
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
      </div>
    </nav>
  )
}
