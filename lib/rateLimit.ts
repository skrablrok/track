// Simple in-memory rate limiter, keyed by IP within a named bucket
// (so e.g. login attempts and registration attempts are throttled independently).

const attempts = new Map<string, { count: number; firstAttempt: number }>()

function makeLimiter(bucket: string, maxAttempts: number, windowMs: number, blockMs: number) {
  function key(ip: string) {
    return `${bucket}:${ip}`
  }

  function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs?: number } {
    const now = Date.now()
    const record = attempts.get(key(ip))

    if (!record) return { allowed: true }

    if (now - record.firstAttempt > windowMs) {
      attempts.delete(key(ip))
      return { allowed: true }
    }

    if (record.count >= maxAttempts) {
      const retryAfterSecs = Math.ceil((record.firstAttempt + blockMs - now) / 1000)
      return { allowed: false, retryAfterSecs: Math.max(retryAfterSecs, 0) }
    }

    return { allowed: true }
  }

  function recordFailedAttempt(ip: string) {
    const now = Date.now()
    const record = attempts.get(key(ip))

    if (!record || now - record.firstAttempt > windowMs) {
      attempts.set(key(ip), { count: 1, firstAttempt: now })
    } else {
      record.count++
    }
  }

  function clearAttempts(ip: string) {
    attempts.delete(key(ip))
  }

  return { checkRateLimit, recordFailedAttempt, clearAttempts }
}

// Login: blocks an IP after 5 failed attempts within 15 minutes, for 30 minutes.
export const {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
} = makeLimiter('login', 5, 15 * 60 * 1000, 30 * 60 * 1000)

// Registration: blocks an IP after 5 attempts within 1 hour, for 1 hour.
// Looser window since it's just abuse/spam prevention, not a compromised-credential defense.
export const {
  checkRateLimit: checkRegisterRateLimit,
  recordFailedAttempt: recordRegisterAttempt,
} = makeLimiter('register', 5, 60 * 60 * 1000, 60 * 60 * 1000)
