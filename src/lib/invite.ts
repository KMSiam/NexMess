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

/**
 * Builds a WhatsApp share deep-link containing the mess name, code, and invite URL.
 */
export function buildWhatsAppInviteUrl(messName: string, code: string, origin?: string): string {
  const cleanCode = normalizeInviteCode(code)
  const link = buildInviteUrl(cleanCode, origin)
  if (!link) return ''
  const cleanName = (messName || 'our mess').trim()
  const message = `Join "${cleanName}" on NexMess using code ${cleanCode}:\n${link}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
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
