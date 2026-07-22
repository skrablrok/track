'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Wrench, QrCode, ClipboardList,
  FolderOpen, BarChart3, Users, LogOut, ClipboardCheck, ShoppingCart, FileSpreadsheet, Building2,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function Sidebar({ role, orgName }: { role: string; orgName?: string }) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const links = [
    { href: '/dashboard',   key: 'nav_dashboard', icon: LayoutDashboard, roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
    { href: '/tools',       key: 'nav_tools',      icon: Wrench,          roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
    { href: '/scan',        key: 'nav_scan',       icon: QrCode,          roles: ['ADMIN','MANAGER','EMPLOYEE'] },
    { href: '/requests',    key: 'nav_requests',   icon: ClipboardCheck,  roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
    { href: '/checkouts',   key: 'nav_checkouts',  icon: ClipboardList,   roles: ['ADMIN','MANAGER','EMPLOYEE'] },
    { href: '/projects',    key: 'nav_projects',   icon: FolderOpen,      roles: ['ADMIN','MANAGER','EMPLOYEE','FOREMAN'] },
    { href: '/reports',     key: 'nav_reports',    icon: BarChart3,       roles: ['ADMIN','MANAGER'] },
    { href: '/admin/procurement', key: 'nav_procurement', icon: ShoppingCart, roles: ['ADMIN','MANAGER'] },
    { href: '/admin/import', key: 'nav_import', icon: FileSpreadsheet, roles: ['ADMIN','MANAGER'] },
    { href: '/admin/users', key: 'nav_users',      icon: Users,           roles: ['ADMIN'] },
  ] as const

  const allowed = links.filter((l) => l.roles.includes(role as any))

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-base leading-tight truncate">{orgName || 'BuildFlow'}</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {allowed.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'sidebar-link',
              pathname === href || pathname.startsWith(href + '/') ? 'active' : ''
            )}
          >
            <Icon size={18} className="shrink-0" />
            {t(key)}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
          {t('nav_signOut')}
        </button>
        <a
          href="https://skrablweb.si"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[10px] text-gray-300 hover:text-gray-400 transition-colors py-1"
        >
          BuildFlow by SKRABLWEB
        </a>
      </div>
    </aside>
  )
}
