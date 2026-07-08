import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function run() {
  console.log('\n=== FUNCTION BODY: calculate_member_balance ===')
  const def = await sql`
    SELECT pg_get_functiondef(oid) AS def
    FROM pg_proc
    WHERE proname = 'calculate_member_balance'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `
  console.log(def[0]?.def)
}

run().catch(console.error)
