import { describe, it, expect } from 'vitest'
import type { Deposit, MessMember, Profile } from '../../../../types/database'
import {
  buildDepositMemberOptions,
  extractMemberUsername,
  filterDepositsByMember,
  summarizeMemberDeposits,
} from '../depositUtils'

function makeProfile(id: string, username: string | null): Profile {
  return {
    id,
    username,
    avatar_url: null,
    is_verified: false,
    contact_no: null,
    updated_at: '2026-11-01T00:00:00Z',
  }
}

function makeMember(userId: string, username: string | null): MessMember {
  return {
    mess_id: 'mess-1',
    user_id: userId,
    status: 'approved',
    role: 'member',
    joined_at: '2026-11-01T00:00:00Z',
    profiles: makeProfile(userId, username),
  }
}

function makeDeposit(
  id: string,
  userId: string,
  amount: number,
  verified: boolean,
  username?: string | null,
): Deposit {
  return {
    id,
    mess_id: 'mess-1',
    user_id: userId,
    amount,
    verified,
    verified_by: verified ? 'mgr-1' : null,
    date: '2026-11-27',
    note: null,
    created_at: '2026-11-27T00:00:00Z',
    profiles: username !== undefined ? makeProfile(userId, username) : undefined,
  }
}

describe('depositUtils', () => {
  it('extracts username with fallback when profile or username is missing', () => {
    expect(extractMemberUsername({ profiles: { username: 'Siam' } }, 'Member')).toBe('Siam')
    expect(extractMemberUsername({ profiles: { username: null } }, 'Member')).toBe('Member')
    expect(extractMemberUsername({}, 'Member')).toBe('Member')
  })

  it('builds deduplicated, sorted member options including former depositors', () => {
    const members = [makeMember('u2', 'Siam'), makeMember('u1', 'Arafat Jim')]
    const deposits = [
      makeDeposit('d1', 'u2', 3990, true, 'Siam'),
      makeDeposit('d2', 'u3', 1500, true, 'Rakib Chowdhury'),
    ]

    expect(buildDepositMemberOptions(members, deposits, 'Member')).toEqual([
      { id: 'u1', name: 'Arafat Jim' },
      { id: 'u3', name: 'Rakib Chowdhury' },
      { id: 'u2', name: 'Siam' },
    ])
  })

  it('filters deposits cleanly for all members vs an individual member', () => {
    const deposits = [
      makeDeposit('d1', 'u1', 3650, true, 'Arafat Jim'),
      makeDeposit('d2', 'u2', 3990, true, 'Siam'),
      makeDeposit('d3', 'u1', 4800, false, 'Arafat Jim'),
    ]

    expect(filterDepositsByMember(deposits, 'all')).toHaveLength(3)
    expect(filterDepositsByMember(deposits, 'u1').map((d) => d.id)).toEqual(['d1', 'd3'])
    expect(filterDepositsByMember(deposits, 'u3')).toEqual([])
  })

  it('summarizes total, verifiedTotal, and pendingCount accurately', () => {
    const deposits = [
      makeDeposit('d1', 'u1', 3650, true),
      makeDeposit('d2', 'u1', 4800, false),
    ]

    expect(summarizeMemberDeposits(deposits)).toEqual({
      total: 8450,
      verifiedTotal: 3650,
      pendingCount: 1,
    })
    expect(summarizeMemberDeposits([])).toEqual({
      total: 0,
      verifiedTotal: 0,
      pendingCount: 0,
    })
  })
})
