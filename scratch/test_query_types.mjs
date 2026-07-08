// No imports of project actions needed

// Wait, we need to run it with mocked or set environment variables, or just run SQL directly
import { neon } from '@neondatabase/serverless'
const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function test() {
  const messId = '7a65b80f-dd7b-4a6b-8732-56703cda4706'
  
  // Let's run the raw queries from getDashboardDetails to see what types they return!
  const todayStr = '2026-07-08'
  const schedules = await sql`
      SELECT ms.assigned_date, p.username
      FROM market_schedules ms
      LEFT JOIN profiles p ON p.id = ms.user_id
      WHERE ms.mess_id = ${messId}::uuid
        AND ms.assigned_date >= ${todayStr}::date
      ORDER BY ms.assigned_date ASC
      LIMIT 3
    `
  console.log('Schedules:', schedules)
  if (schedules.length > 0) {
    console.log('Type of assigned_date:', typeof schedules[0].assigned_date, schedules[0].assigned_date)
  }

  const expenses = await sql`
      SELECT e.id, e.amount, e.category, e.created_at, p.username
      FROM expenses e
      LEFT JOIN profiles p ON p.id = e.created_by
      WHERE e.mess_id = ${messId}::uuid
      ORDER BY e.created_at DESC
      LIMIT 3
    `
  console.log('Expenses:', expenses)
  if (expenses.length > 0) {
    console.log('Type of created_at:', typeof expenses[0].created_at, expenses[0].created_at)
  }
}

test().catch(console.error)
