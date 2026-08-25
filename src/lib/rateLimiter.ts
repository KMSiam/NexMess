/**
 * Client-Side Rate Limiter & Exponential Backoff Engine
 * 
 * Provides defense-in-depth protection against brute-force attacks and credential stuffing
 * on client-facing authentication and sensitive action forms.
 * 
 * Features:
 * - Exponential backoff on repeated failures (e.g. 1s -> 2s -> 4s -> 8s -> 16s -> 30s)
 * - Configurable thresholds per route/action
 * - Auto-expiration & sliding reset window
 * - Persistence in localStorage so refreshing the page does not reset the cooldown
 */

export interface RateLimitOptions {
  /** Number of failed attempts allowed before backoff delay activates (default: 3) */
  maxAttemptsBeforeDelay: number
  /** Initial delay in milliseconds when backoff starts (default: 1000ms) */
  initialDelayMs: number
  /** Multiplier applied to subsequent failed attempts (default: 2) */
  multiplier: number
  /** Maximum delay cap in milliseconds (default: 30000ms = 30s) */
  maxDelayMs: number
  /** Time in milliseconds after which failed attempts reset if no further attempts occur (default: 60000ms = 1m) */
  resetWindowMs: number
}

export interface RateLimitStatus {
  allowed: boolean
  retryAfterMs: number
  retryAfterSec: number
  attempts: number
  message?: string
}

interface AttemptRecord {
  attempts: number
  lastAttemptTime: number
  blockedUntil: number
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  maxAttemptsBeforeDelay: 3,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
  resetWindowMs: 60000,
}

// Memory fallback if localStorage is unavailable
const memoryStore = new Map<string, AttemptRecord>()

function getStorageKey(key: string): string {
  return `nex_rl_${key.toLowerCase().replace(/[^a-z0-9_:-]/g, '_')}`
}

function loadRecord(key: string): AttemptRecord | null {
  const storageKey = getStorageKey(key)
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      return JSON.parse(raw) as AttemptRecord
    }
  } catch {
    // fallback to memory
  }
  return memoryStore.get(storageKey) || null
}

function saveRecord(key: string, record: AttemptRecord): void {
  const storageKey = getStorageKey(key)
  try {
    localStorage.setItem(storageKey, JSON.stringify(record))
  } catch {
    // fallback to memory
  }
  memoryStore.set(storageKey, record)
}

function clearRecord(key: string): void {
  const storageKey = getStorageKey(key)
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // fallback to memory
  }
  memoryStore.delete(storageKey)
}

/**
 * Check if an action is currently rate-limited
 */
export function checkRateLimit(
  key: string,
  customOptions?: Partial<RateLimitOptions>
): RateLimitStatus {
  const opts: RateLimitOptions = { ...DEFAULT_OPTIONS, ...customOptions }
  const now = Date.now()
  const record = loadRecord(key)

  if (!record) {
    return {
      allowed: true,
      retryAfterMs: 0,
      retryAfterSec: 0,
      attempts: 0,
    }
  }

  // Check if window has expired since last attempt
  if (now - record.lastAttemptTime > opts.resetWindowMs && now > record.blockedUntil) {
    clearRecord(key)
    return {
      allowed: true,
      retryAfterMs: 0,
      retryAfterSec: 0,
      attempts: 0,
    }
  }

  // Check if currently in a backoff cooldown
  if (now < record.blockedUntil) {
    const remainingMs = record.blockedUntil - now
    const remainingSec = Math.ceil(remainingMs / 1000)
    return {
      allowed: false,
      retryAfterMs: remainingMs,
      retryAfterSec: remainingSec,
      attempts: record.attempts,
      message: `Too many attempts. Please wait ${remainingSec}s before trying again.`,
    }
  }

  return {
    allowed: true,
    retryAfterMs: 0,
    retryAfterSec: 0,
    attempts: record.attempts,
  }
}

/**
 * Record an attempt result (success or failure)
 */
export function recordRateLimitAttempt(
  key: string,
  success: boolean,
  customOptions?: Partial<RateLimitOptions>
): void {
  const opts: RateLimitOptions = { ...DEFAULT_OPTIONS, ...customOptions }
  const now = Date.now()

  if (success) {
    clearRecord(key)
    return
  }

  const existing = loadRecord(key)
  let attempts = 1

  if (existing) {
    // If last attempt was within reset window, increment attempts
    if (now - existing.lastAttemptTime <= opts.resetWindowMs || now < existing.blockedUntil) {
      attempts = existing.attempts + 1
    }
  }

  let blockedUntil = 0

  // If exceeded threshold, calculate exponential backoff delay
  if (attempts >= opts.maxAttemptsBeforeDelay) {
    const exponent = attempts - opts.maxAttemptsBeforeDelay
    const delay = Math.min(
      opts.initialDelayMs * Math.pow(opts.multiplier, exponent),
      opts.maxDelayMs
    )
    blockedUntil = now + delay
  }

  saveRecord(key, {
    attempts,
    lastAttemptTime: now,
    blockedUntil,
  })
}

/**
 * Reset rate limit counter for a specific key
 */
export function resetRateLimit(key: string): void {
  clearRecord(key)
}
