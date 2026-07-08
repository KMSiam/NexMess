'use server'

import { auth, currentUser, createClerkClient } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import type { Profile } from '@/types/database'
import { randomUUID } from 'crypto'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

/**
 * Helper: Get the database UUID for the current or specified Clerk user.
 * If not set, generates a new UUID, updates Clerk, and ensures profile exists.
 */
export async function getDbUserId(clerkUserId?: string): Promise<string> {
  let user
  if (clerkUserId) {
    user = await clerkClient.users.getUser(clerkUserId)
  } else {
    user = await currentUser()
  }
  if (!user) throw new Error('Unauthorized')

  if (user.externalId) {
    return user.externalId
  }

  // Generate new UUID
  const newUuid = randomUUID()

  // Update Clerk user's externalId
  await clerkClient.users.updateUser(user.id, { externalId: newUuid })

  // Ensure a database profile exists with this UUID
  const username = user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'user'
  await sql`
    INSERT INTO profiles (id, username, updated_at)
    VALUES (${newUuid}::uuid, ${username}, now())
    ON CONFLICT (id) DO NOTHING
  `

  return newUuid
}

/**
 * Get the current user's Neon database profile.
 */
export async function getProfile(): Promise<Profile | null> {
  const { userId } = await auth()
  if (!userId) return null

  try {
    const dbUserId = await getDbUserId(userId)
    const rows = await sql`SELECT * FROM profiles WHERE id = ${dbUserId}::uuid LIMIT 1`
    return (rows[0] as Profile) ?? null
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

/**
 * Get profile by database user ID (UUID)
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const rows = await sql`SELECT * FROM profiles WHERE id = ${userId}::uuid LIMIT 1`
  return (rows[0] as Profile) ?? null
}

/**
 * Update the current user's profile
 */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const dbUserId = await getDbUserId(userId)
  const { username, avatar_url, contact_no, emergency_contact_no } = updates

  const rows = await sql`
    UPDATE profiles
    SET
      username             = COALESCE(${username ?? null}, username),
      avatar_url           = COALESCE(${avatar_url ?? null}, avatar_url),
      contact_no           = COALESCE(${contact_no ?? null}, contact_no),
      emergency_contact_no = COALESCE(${emergency_contact_no ?? null}, emergency_contact_no),
      updated_at           = now()
    WHERE id = ${dbUserId}::uuid
    RETURNING *
  `
  return (rows[0] as Profile) ?? null
}

/**
 * Ensure a profile row exists for the user.
 */
export async function ensureProfile(
  clerkUserId: string,
  dbUserId: string,
  username?: string
): Promise<Profile> {
  await sql`
    INSERT INTO profiles (id, username, updated_at)
    VALUES (${dbUserId}::uuid, ${username ?? null}, now())
    ON CONFLICT (id) DO NOTHING
  `

  const rows = await sql`SELECT * FROM profiles WHERE id = ${dbUserId}::uuid`
  return rows[0] as Profile
}

/**
 * Restore a deleted profile/account
 */
export async function restoreAccount(): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const dbUserId = await getDbUserId(userId)
  await sql`
    UPDATE profiles
    SET deleted_at = NULL
    WHERE id = ${dbUserId}::uuid
  `
}

/**
 * Deactivate the current user's profile/account
 */
export async function deactivateAccount(): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const dbUserId = await getDbUserId(userId)
  await sql`
    UPDATE profiles
    SET deleted_at = now()
    WHERE id = ${dbUserId}::uuid
  `
}

