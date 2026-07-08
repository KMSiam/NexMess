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

async function run() {
  console.log('Migrating chat_messages text column for images...')
  
  const res = await sql`
    UPDATE chat_messages
    SET text = '/api/media?key=' || substring(text from 'https://[^/]+/(.*)')
    WHERE message_type = 'image' AND text LIKE 'http%'
  `
  console.log('Chat messages migrated successfully!')
}

run().catch(console.error)
