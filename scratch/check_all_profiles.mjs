import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function run() {
  const rows = await sql`SELECT id, username, contact_no, avatar_url, deleted_at FROM profiles`
  console.log('All Profiles in DB:', rows)
}

run().catch(console.error)
