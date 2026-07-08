import { neon } from '@neondatabase/serverless'
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

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL!')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function check() {
  const rows = await sql`
    SELECT id, username, avatar_url FROM profiles
    WHERE username LIKE '%Siam%'
    LIMIT 5
  `
  console.log('Profiles found:', rows)
}

check().catch(console.error)
