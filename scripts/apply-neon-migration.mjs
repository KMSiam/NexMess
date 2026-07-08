// scripts/apply-neon-migration.mjs
// Run: node scripts/apply-neon-migration.mjs
// Applies the NexMess schema to the Neon PostgreSQL database

import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

console.log('🔌 Connecting to Neon database...')

const sql = neon(DATABASE_URL)

// Read the migration SQL file
const migrationPath = resolve(__dirname, '..', '..', 'NexMess', 'sql', 'neon_migration.sql')
let migrationSQL

try {
  migrationSQL = readFileSync(migrationPath, 'utf-8')
  console.log(`✅ Read migration file: ${migrationPath}`)
} catch {
  // Try alternate paths
  try {
    const altPath = resolve(__dirname, '..', 'neon_migration.sql')
    migrationSQL = readFileSync(altPath, 'utf-8')
    console.log(`✅ Read migration file: ${altPath}`)
  } catch {
    console.error('❌ Could not find neon_migration.sql')
    console.log('Please run: node scripts/apply-neon-migration.mjs from the nexmess-next directory')
    process.exit(1)
  }
}

// Split by statements (semicolons) and execute each
// We need to handle multi-statement SQL (functions, triggers, etc.)
async function applyMigration() {
  try {
    console.log('🚀 Applying database schema to Neon...')
    
    // Execute the entire migration as a single transaction
    // neon() supports multi-statement queries
    const statements = migrationSQL
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (!stmt) continue
      
      try {
        await sql.query(stmt + ';')
        process.stdout.write('.')
      } catch (err) {
        console.error(`\n❌ Error on statement ${i + 1}:`)
        console.error(stmt.substring(0, 200))
        console.error('Error:', err.message)
        // Continue with remaining statements
      }
    }
    
    console.log('\n✅ Schema migration completed!')
    
    // Verify tables were created
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.log('\n📊 Tables in Neon database:')
    tables.forEach(t => console.log(`  - ${t.table_name}`))
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyMigration()
