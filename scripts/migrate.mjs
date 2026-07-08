import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function main() {
  // First check connection
  const ping = await sql`SELECT current_database(), version()`
  console.log('✅ Connected to Neon:', ping[0].current_database)

  // Check existing tables
  const existing = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `
  console.log('📊 Existing tables:', existing.map(t => t.table_name).join(', ') || '(none)')

  // Read migration file
  const migPath = resolve(__dir, '../../NexMess/sql/neon_migration.sql')
  const migSQL = readFileSync(migPath, 'utf-8')
  console.log(`📄 Migration file read: ${migSQL.length} bytes`)

  // Split into individual statements - handle $$ functions specially
  // We'll execute the migration in logical sections
  const sections = [
    // 1. Extension
    `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
    
    // 2. Tables (in dependency order)
    `CREATE TABLE IF NOT EXISTS public.profiles (
      id uuid NOT NULL,
      username text,
      avatar_url text,
      is_verified boolean DEFAULT false,
      contact_no text,
      updated_at timestamptz,
      deleted_at timestamptz,
      verification_doc_type text,
      verification_doc_no text,
      verification_doc_url text,
      emergency_contact_no text,
      CONSTRAINT profiles_pkey PRIMARY KEY (id),
      CONSTRAINT profiles_username_key UNIQUE (username),
      CONSTRAINT profiles_verification_doc_type_check
        CHECK (verification_doc_type = ANY (ARRAY['nid','birth_certificate','other']))
    )`,

    `CREATE TABLE IF NOT EXISTS public.messes (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      name text NOT NULL,
      unique_code text NOT NULL,
      manager_id uuid,
      public_info jsonb,
      created_at timestamptz DEFAULT now(),
      max_members integer DEFAULT 10,
      is_active boolean DEFAULT true,
      location text,
      rules_and_info text,
      CONSTRAINT messes_pkey PRIMARY KEY (id),
      CONSTRAINT messes_unique_code_key UNIQUE (unique_code),
      CONSTRAINT messes_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS public.mess_members (
      mess_id uuid NOT NULL,
      user_id uuid NOT NULL,
      status text DEFAULT 'pending',
      role text DEFAULT 'member',
      joined_at timestamptz DEFAULT now(),
      left_at timestamptz,
      CONSTRAINT mess_members_pkey PRIMARY KEY (mess_id, user_id),
      CONSTRAINT mess_members_role_check CHECK (role = ANY (ARRAY['member','manager'])),
      CONSTRAINT mess_members_status_check CHECK (status = ANY (ARRAY['pending','approved','left'])),
      CONSTRAINT mess_members_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT mess_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.meals (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      user_id uuid,
      mess_id uuid,
      date date NOT NULL,
      lunch boolean DEFAULT false,
      dinner boolean DEFAULT false,
      guest_lunch integer DEFAULT 0,
      guest_dinner integer DEFAULT 0,
      CONSTRAINT meals_pkey PRIMARY KEY (id),
      CONSTRAINT meals_user_id_mess_id_date_key UNIQUE (user_id, mess_id, date),
      CONSTRAINT meals_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT meals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.expenses (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid,
      amount numeric NOT NULL,
      category text,
      description text,
      date date NOT NULL,
      created_by uuid,
      created_at timestamptz DEFAULT now(),
      expense_type text DEFAULT 'bazaar',
      receipt_url text,
      CONSTRAINT expenses_pkey PRIMARY KEY (id),
      CONSTRAINT expenses_expense_type_check CHECK (expense_type = ANY (ARRAY['bazaar','fixed','other'])),
      CONSTRAINT expenses_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.deposits (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      user_id uuid NOT NULL,
      amount numeric NOT NULL,
      verified boolean DEFAULT false,
      verified_by uuid,
      date date NOT NULL,
      note text,
      created_at timestamptz DEFAULT now(),
      CONSTRAINT deposits_pkey PRIMARY KEY (id),
      CONSTRAINT deposits_amount_check CHECK (amount > 0),
      CONSTRAINT deposits_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
      CONSTRAINT deposits_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id)
    )`,

    `CREATE TABLE IF NOT EXISTS public.fixed_costs (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      category text NOT NULL,
      label text,
      amount numeric NOT NULL,
      month text NOT NULL,
      created_by uuid,
      created_at timestamptz DEFAULT now(),
      is_paid boolean NOT NULL DEFAULT false,
      CONSTRAINT fixed_costs_pkey PRIMARY KEY (id),
      CONSTRAINT fixed_costs_amount_check CHECK (amount >= 0),
      CONSTRAINT fixed_costs_category_check CHECK (category = ANY (ARRAY['rent','utilities','maid','internet','gas','other'])),
      CONSTRAINT fixed_costs_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT fixed_costs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.market_schedules (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid,
      user_id uuid,
      assigned_date date NOT NULL,
      CONSTRAINT market_schedules_pkey PRIMARY KEY (id),
      CONSTRAINT market_schedules_unique UNIQUE (mess_id, user_id, assigned_date),
      CONSTRAINT market_schedules_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT market_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.chat_messages (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid,
      sender_id uuid,
      text text NOT NULL,
      created_at timestamptz DEFAULT now(),
      message_type text DEFAULT 'text',
      CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
      CONSTRAINT chat_messages_message_type_check CHECK (message_type = ANY (ARRAY['text','image','system'])),
      CONSTRAINT chat_messages_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.chat_reactions (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      message_id uuid NOT NULL,
      user_id uuid NOT NULL,
      emoji text NOT NULL,
      created_at timestamptz DEFAULT now(),
      CONSTRAINT chat_reactions_pkey PRIMARY KEY (id),
      CONSTRAINT chat_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji),
      CONSTRAINT chat_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE,
      CONSTRAINT chat_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.notifications (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      mess_id uuid,
      type text NOT NULL,
      title text NOT NULL,
      body text,
      is_read boolean DEFAULT false,
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      CONSTRAINT notifications_pkey PRIMARY KEY (id),
      CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['bazaar_reminder','join_request','join_approved','join_rejected','expense_added','balance_due','meal_reminder','role_transfer','member_removed','deposit_verified','system'])),
      CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
      CONSTRAINT notifications_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.notices (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      message text NOT NULL,
      created_by uuid NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT notices_pkey PRIMARY KEY (id),
      CONSTRAINT notices_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT notices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    )`,

    `CREATE TABLE IF NOT EXISTS public.push_subscriptions (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      endpoint text NOT NULL,
      p256dh text NOT NULL,
      auth text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
      CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint),
      CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.meal_routines (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      day_of_week integer NOT NULL,
      lunch text NOT NULL DEFAULT '',
      dinner text NOT NULL DEFAULT '',
      updated_by uuid,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT meal_routines_pkey PRIMARY KEY (id),
      CONSTRAINT meal_routines_mess_id_day_of_week_key UNIQUE (mess_id, day_of_week),
      CONSTRAINT meal_routines_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
      CONSTRAINT meal_routines_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT meal_routines_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
    )`,

    `CREATE TABLE IF NOT EXISTS public.emergency_contacts (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      name text NOT NULL,
      phone text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id),
      CONSTRAINT emergency_contacts_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.monthly_reports (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      month text NOT NULL,
      generated_at timestamptz NOT NULL DEFAULT now(),
      generated_by uuid,
      summary jsonb NOT NULL,
      CONSTRAINT monthly_reports_pkey PRIMARY KEY (id),
      CONSTRAINT monthly_reports_mess_id_month_key UNIQUE (mess_id, month),
      CONSTRAINT monthly_reports_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.monthly_reports_cron_log (
      month text NOT NULL,
      mess_count integer NOT NULL,
      ran_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT monthly_reports_cron_log_pkey PRIMARY KEY (month)
    )`,

    `CREATE TABLE IF NOT EXISTS public.market_chat_messages (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      sender_id uuid,
      text text NOT NULL,
      is_ai boolean NOT NULL DEFAULT false,
      is_daily_update boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT market_chat_messages_pkey PRIMARY KEY (id),
      CONSTRAINT market_chat_messages_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT market_chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS public.bazaar_reminders_log (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      mess_id uuid NOT NULL,
      assigned_date date NOT NULL,
      sent_to uuid NOT NULL,
      sent_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT bazaar_reminders_log_pkey PRIMARY KEY (id),
      CONSTRAINT bazaar_reminders_log_mess_id_assigned_date_key UNIQUE (mess_id, assigned_date),
      CONSTRAINT bazaar_reminders_log_mess_id_fkey FOREIGN KEY (mess_id) REFERENCES public.messes(id) ON DELETE CASCADE,
      CONSTRAINT bazaar_reminders_log_sent_to_fkey FOREIGN KEY (sent_to) REFERENCES public.profiles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS public.user_feedback (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      name text,
      email text,
      message text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT user_feedback_pkey PRIMARY KEY (id)
    )`,

    // 3. Indexes
    `CREATE INDEX IF NOT EXISTS idx_meals_mess_id ON public.meals(mess_id)`,
    `CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_meals_date ON public.meals(date)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_mess_id ON public.expenses(mess_id)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date)`,
    `CREATE INDEX IF NOT EXISTS idx_deposits_mess_id ON public.deposits(mess_id)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_mess_id ON public.chat_messages(mess_id)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_market_schedules_mess_id ON public.market_schedules(mess_id)`,
    `CREATE INDEX IF NOT EXISTS idx_market_schedules_assigned_date ON public.market_schedules(assigned_date)`,
  ]

  let success = 0, errors = 0
  for (const stmt of sections) {
    try {
      await sql.query(stmt)
      process.stdout.write('.')
      success++
    } catch (e) {
      if (e.message.includes('already exists')) {
        process.stdout.write('s') // skip
      } else {
        console.error(`\n⚠️  ${e.message.substring(0, 120)}`)
        errors++
      }
    }
  }

  console.log(`\n\n✅ Done! ${success} statements applied, ${errors} errors`)

  // Final table list
  const tables = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name
  `
  console.log('📊 Tables in Neon:')
  for (const t of tables) console.log('  ✓', t.table_name)
}

main().catch(err => { console.error(err); process.exit(1) })
