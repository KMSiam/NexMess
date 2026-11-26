import type { Deposit, MessMember } from '../../../types/database'

export interface DepositMemberOption {
  id: string
  name: string
}

export interface DepositSummary {
  total: number
  verifiedTotal: number
  pendingCount: number
}

/**
 * Safely reads joined `profiles.username` without requiring unsafe casts.
 */
export function extractMemberUsername(item: unknown, fallback: string): string {
  if (item && typeof item === 'object' && 'profiles' in item) {
    const profiles = (item as { profiles?: { username?: string | null } | null }).profiles
    if (profiles?.username) return profiles.username
  }
  return fallback
}

/**
 * Builds a sorted, deduplicated member option list combining current approved members
 * and historical depositors (e.g. members who left during the month).
 */
export function buildDepositMemberOptions(
  approvedMembers: MessMember[],
  deposits: Deposit[],
  fallbackName: string,
): DepositMemberOption[] {
  const membersMap = new Map<string, DepositMemberOption>()

  for (const member of approvedMembers) {
    membersMap.set(member.user_id, {
      id: member.user_id,
      name: extractMemberUsername(member, fallbackName),
    })
  }

  for (const deposit of deposits) {
    if (!membersMap.has(deposit.user_id)) {
      membersMap.set(deposit.user_id, {
        id: deposit.user_id,
        name: extractMemberUsername(deposit, fallbackName),
      })
    }
  }

  return Array.from(membersMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Filters deposits by selected member ID, returning all entries when `'all'` is selected.
 */
export function filterDepositsByMember(deposits: Deposit[], memberId: string): Deposit[] {
  if (memberId === 'all') return deposits
  return deposits.filter((deposit) => deposit.user_id === memberId)
}

/**
 * Computes total, verified total, and pending count for a filtered deposit list.
 */
export function summarizeMemberDeposits(deposits: Deposit[]): DepositSummary {
  let total = 0
  let verifiedTotal = 0
  let pendingCount = 0

  for (const deposit of deposits) {
    const amount = Number(deposit.amount) || 0
    total += amount
    if (deposit.verified) {
      verifiedTotal += amount
    } else {
      pendingCount += 1
    }
  }

  return { total, verifiedTotal, pendingCount }
}
