import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import HelpButton from '@/components/HelpButton'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const lang = cookies().get('lang')?.value || 'sl'

  return (
    <LanguageProvider initialLang={lang}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar role={session.user.role} orgName={session.user.orgName} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header user={session.user} orgName={session.user.orgName} />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav role={session.user.role} />
        <HelpButton />
      </div>
    </LanguageProvider>
  )
}
