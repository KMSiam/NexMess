import { createClerkClient } from '@clerk/backend'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
try {
  const envContent = readFileSync(resolve('.env.local'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const parts = trimmed.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      process.env[key] = val
    }
  }
} catch (e) {
  console.error('Failed to load .env.local:', e.message)
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error('Missing CLERK_SECRET_KEY!')
  process.exit(1)
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

async function run() {
  console.log('Listing Clerk Users...')
  const users = await clerkClient.users.getUserList()
  console.log('Clerk Users Count:', users.data.length)
  for (const u of users.data) {
    console.log({
      id: u.id,
      username: u.username,
      email: u.emailAddresses[0]?.emailAddress,
      externalId: u.externalId
    })
  }
}

run().catch(console.error)
