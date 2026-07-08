import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function run() {
  console.log('\n=== ALL MESSES ===')
  const messes = await sql`SELECT id, name, unique_code, manager_id FROM messes`
  console.log(messes)

  console.log('\n=== ALL MESS MEMBERS ===')
  const members = await sql`SELECT mess_id, user_id, role, status FROM mess_members`
  console.log(members)
  
  console.log('\n=== ALL MONTHLY REPORTS ===')
  const reports = await sql`SELECT id, mess_id, month FROM monthly_reports`
  console.log(reports)
}

run().catch(console.error)
