'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Wrench, QrCode, ClipboardCheck,
  FolderOpen, ClipboardList, BarChart3, Users, ShoppingCart, FileSpreadsheet,
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
  { href: '/admin/procurement', key: 'nav_procurement', icon: ShoppingCart, roles: ['ADMIN','MANAGER'] },
  { href: '/admin/import', key: 'nav_import', icon: FileSpreadsheet, roles: ['ADMIN','MANAGER'] },
  { href: '/admin/users', key: 'nav_users',     icon: Users,           roles: ['ADMIN'] },
] as const

export default function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const allowed = ALL_LINKS.filter((l) => (l.roles as readonly string[]).includes(role))

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="flex overflow-x-auto no-scrollbar">
        {allowed.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isScan = href === '/scan'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-shrink-0 basis-[20%] flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
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
              {!isScan && <span className="truncate max-w-[64px] text-center">{t(key)}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
