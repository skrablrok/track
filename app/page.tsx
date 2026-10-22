import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role === 'SUPER_ADMIN') redirect('/super-admin')
  if (session) redirect('/dashboard')
  redirect('/login')
}
