
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

async function test() {
  try {
    const results = await sql.transaction([
      sql`SELECT 1 as one`,
      sql`SELECT 2 as two`
    ])
    console.log('Transaction success:', results)
  } catch (err) {
    console.error('Transaction error:', err)
  }
}

test()
