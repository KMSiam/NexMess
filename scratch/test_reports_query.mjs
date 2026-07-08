import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function test() {
  const messId = '7a65b80f-dd7b-4a6b-8732-56703cda4706'
  const userId = 'e198addb-443d-4250-8202-98b0282be1bd'

  // Let's verify membership first
  const rows = await sql`
    SELECT role FROM mess_members
    WHERE user_id = ${userId}::uuid AND mess_id = ${messId}::uuid AND status = 'approved'
    LIMIT 1
  `
  console.log('Membership role:', rows[0])

  // Let's run getMonthlyReports query
  const reports = await sql`
    SELECT * FROM monthly_reports
    WHERE mess_id = ${messId}::uuid
    ORDER BY month DESC
  `
  console.log('Reports in DB:', reports)
}

test().catch(console.error)
