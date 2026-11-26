import { describe, it, expect, beforeEach } from 'vitest'
import {
  normalizeInviteCode,
  buildInviteUrl,
  buildWhatsAppInviteUrl,
  savePendingInviteCode,
  getPendingInviteCode,
  clearPendingInviteCode,
} from '../invite'

describe('Mess Invite Helper', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('normalizes valid mess codes and rejects invalid/malicious codes', () => {
    expect(normalizeInviteCode(' nex-41b3 ')).toBe('NEX-41B3')
    expect(normalizeInviteCode('AB12')).toBe('AB12')
    expect(normalizeInviteCode('')).toBe('')
    expect(normalizeInviteCode('bad/code?query=1')).toBe('')
    expect(normalizeInviteCode('<script>alert(1)</script>')).toBe('')
  })

  it('builds safe shareable invite and WhatsApp URLs', () => {
    expect(buildInviteUrl('nex-41b3', 'https://www.nexmess.shop/')).toBe(
      'https://www.nexmess.shop/join/NEX-41B3'
    )
    expect(buildInviteUrl('invalid/code', 'https://www.nexmess.shop')).toBe('')

    const wa = buildWhatsAppInviteUrl('BachelorPoint', 'nex-41b3', 'https://www.nexmess.shop')
    expect(wa).toContain('https://wa.me/?text=')
    expect(decodeURIComponent(wa)).toContain('BachelorPoint')
    expect(decodeURIComponent(wa)).toContain('https://www.nexmess.shop/join/NEX-41B3')
  })

  it('persists and clears pending invite code safely in storage', () => {
    expect(savePendingInviteCode('nex-99aa')).toBe('NEX-99AA')
    expect(getPendingInviteCode()).toBe('NEX-99AA')
    clearPendingInviteCode()
    expect(getPendingInviteCode()).toBe('')
  })
})
