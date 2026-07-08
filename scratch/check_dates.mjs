import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function run() {
  const expenses = await sql`SELECT id, amount, date FROM expenses`
  console.log('Expenses:', expenses)
  
  const deposits = await sql`SELECT id, amount, date FROM deposits`
  console.log('Deposits:', deposits)
}

run().catch(console.error)
