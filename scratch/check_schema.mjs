import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function run() {
  console.log('\n=== TABLES IN DATABASE ===')
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
  console.log(tables.map(t => t.table_name))

  console.log('\n=== FUNCTIONS IN DATABASE ===')
  const funcs = await sql`
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    ORDER BY routine_name
  `
  console.log(funcs.map(f => f.routine_name))

  console.log('\n=== TEST calculate_member_balance ===')
  try {
    const result = await sql`SELECT * FROM calculate_member_balance('7a65b80f-dd7b-4a6b-8732-56703cda4706'::uuid, '2026-07')`
    console.log('OK:', result)
  } catch (err) {
    console.error('FAILED:', err.message)
  }
}

run().catch(console.error)
