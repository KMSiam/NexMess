import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create the Neon HTTP client (edge/serverless compatible)
const sql = neon(process.env.DATABASE_URL)

// Create Drizzle ORM instance
export const db = drizzle(sql)

// Export raw SQL client for complex queries if needed
export { sql }
