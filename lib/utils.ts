import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDuration, intervalToDuration } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const duration = intervalToDuration({ start: 0, end: minutes * 60 * 1000 })
  return formatDuration(duration, { format: ['days', 'hours', 'minutes'] })
}

export function calcDurationMins(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

export async function requireAuth(req?: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

export async function requireRole(roles: string[], req?: NextRequest) {
  const user = await requireAuth(req)
  if (!roles.includes(user.role as string)) throw new Error('Forbidden')
  return user
}

export async function logAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  await db.auditLog.create({
    data: { userId, action, entity, entityId, details },
  })
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function serverError(message = 'Internal server error') {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}
