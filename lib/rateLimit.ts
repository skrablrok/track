// Simple in-memory rate limiter for login attempts
// Blocks an IP after 5 failed attempts within 15 minutes

const attempts = new Map<string, { count: number; firstAttempt: number }>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const BLOCK_MS = 30 * 60 * 1000  // 30 minute block after limit hit

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs?: number } {
  const now = Date.now()
  const record = attempts.get(ip)

  if (!record) {
    return { allowed: true }
  }

  // Reset window if enough time has passed
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(ip)
    return { allowed: true }
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((record.firstAttempt + BLOCK_MS - now) / 1000)
    return { allowed: false, retryAfterSecs: Math.max(retryAfterSecs, 0) }
  }

  return { allowed: true }
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const record = attempts.get(ip)

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now })
  } else {
    record.count++
  }
}

export function clearAttempts(ip: string) {
  attempts.delete(ip)
}
