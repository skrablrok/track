import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rateLimit'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        const ip =
          (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          (req?.headers?.['x-real-ip'] as string) ||
          'unknown'

        const { allowed, retryAfterSecs } = checkRateLimit(ip)
        if (!allowed) {
          const mins = Math.ceil((retryAfterSecs ?? 0) / 60)
          throw new Error(`Too many failed attempts. Try again in ${mins} minute(s).`)
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        // Always run bcrypt even when user not found — prevents timing-based user enumeration
        const dummyHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/1XKAP12'
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user?.password ?? dummyHash
        )

        if (!user || !user.active || !user.setupComplete || !passwordMatch) {
          recordFailedAttempt(ip)
          await db.auditLog.create({
            data: {
              action: 'FAILED_LOGIN',
              entity: 'User',
              details: `Failed login for: ${credentials.email} from IP: ${ip}`,
            },
          })
          return null
        }

        clearAttempts(ip)

        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            entity: 'User',
            entityId: user.id,
            organizationId: user.organizationId,
            details: `${user.email} logged in from IP: ${ip}`,
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.organizationId = (user as any).organizationId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string
      }
      return session
    },
  },
}
