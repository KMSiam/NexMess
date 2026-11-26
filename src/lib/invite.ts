const PENDING_INVITE_KEY = 'nexmess_pending_invite'
const CODE_PATTERN = /^[A-Z0-9-]{4,20}$/

/**
 * Normalizes and validates a mess invite code (e.g. "nex-41b3" -> "NEX-41B3").
 */
export function normalizeInviteCode(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return ''
  const trimmed = raw.trim().toUpperCase()
  return CODE_PATTERN.test(trimmed) ? trimmed : ''
}

/**
 * Builds the shareable one-tap invite URL for a mess code.
 */
export function buildInviteUrl(code: string, origin?: string): string {
  const clean = normalizeInviteCode(code)
  if (!clean) return ''
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://www.nexmess.shop')
  return `${base.replace(/\/+$/, '')}/join/${encodeURIComponent(clean)}`
}

export interface InviteShareData {
  title: string
  text: string
  url: string
}

/**
 * Builds Web Share API payload containing the mess name, code, and invite URL.
 */
export function buildInviteShareData(
  messName: string,
  code: string,
  origin?: string
): InviteShareData | null {
  const cleanCode = normalizeInviteCode(code)
  const url = buildInviteUrl(cleanCode, origin)
  if (!url) return null
  const cleanName = (messName || 'our mess').trim()
  return {
    title: `Join ${cleanName} on NexMess`,
    text: `Join "${cleanName}" on NexMess using code ${cleanCode}:`,
    url,
  }
}

export function savePendingInviteCode(raw: string | null | undefined): string {
  const clean = normalizeInviteCode(raw)
  if (!clean) return ''
  try {
    localStorage.setItem(PENDING_INVITE_KEY, clean)
  } catch {
    // Ignore storage errors in restricted environments
  }
  return clean
}

export function getPendingInviteCode(): string {
  try {
    return normalizeInviteCode(localStorage.getItem(PENDING_INVITE_KEY))
  } catch {
    return ''
  }
}

export function clearPendingInviteCode(): void {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    // Ignore storage errors in restricted environments
  }
}
