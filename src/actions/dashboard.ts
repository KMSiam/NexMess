'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { getDbUserId } from '@/actions/profile'
import { dhakaToday, dhakaTomorrow } from '@/lib/utils'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

/**
 * Fetch all dashboard details for a mess in a single roundtrip.
 */
export async function getDashboardDetails(messId: string) {
  const userId = await getCurrentUserId()

  // Validate membership
  const member = await sql`
    SELECT role FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!member[0]) throw new Error('Access denied')

  const todayStr = dhakaToday()
  const tomorrowStr = dhakaTomorrow()
  const currentMonth = todayStr.slice(0, 7)
  const startOfMonth = `${currentMonth}-01`

  // Get day of week for routine (0-6 where 0 = Sunday)
  const _dhakaBase = new Date(todayStr + 'T00:00:00+06:00')
  const todayDow = (_dhakaBase.getUTCDay() + 1) % 7
  const _dhakaTomorrow = new Date(_dhakaBase.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowDow = (_dhakaTomorrow.getUTCDay() + 1) % 7

  // Run queries in parallel on the server
  // Run all queries in parallel on the server (single roundtrip)
  const [
    myMeals,
    allMeals,
    notice,
    schedules,
    unpaidFixed,
    expenses,
    deposits,
    routines,
    contacts,
    balances,
    totalSpentRes,
    totalMealsRes,
  ] = await Promise.all([
    // 1. Personal Meals
    sql`
      SELECT date, lunch, dinner, guest_lunch, guest_dinner
      FROM meals
      WHERE user_id = ${userId}::uuid
        AND mess_id = ${messId}::uuid
        AND date IN (${todayStr}::date, ${tomorrowStr}::date)
    `,
    // 2. All Meals
    sql`
      SELECT date, lunch, dinner, guest_lunch, guest_dinner
      FROM meals
      WHERE mess_id = ${messId}::uuid
        AND date IN (${todayStr}::date, ${tomorrowStr}::date)
    `,
    // 3. Notice
    sql`
      SELECT id, message, created_at, created_by
      FROM notices
      WHERE mess_id = ${messId}::uuid
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `,
    // 4. Upcoming bazaar
    sql`
      SELECT ms.assigned_date, p.username
      FROM market_schedules ms
      LEFT JOIN profiles p ON p.id = ms.user_id
      WHERE ms.mess_id = ${messId}::uuid
        AND ms.assigned_date >= ${todayStr}::date
      ORDER BY ms.assigned_date ASC
      LIMIT 3
    `,
    // 5. Unpaid fixed costs
    sql`
      SELECT COUNT(*)::int as count
      FROM fixed_costs
      WHERE mess_id = ${messId}::uuid
        AND month = ${currentMonth}
        AND is_paid = false
    `,
    // 6. Recent expenses
    sql`
      SELECT e.id, e.amount, e.category, e.created_at, p.username
      FROM expenses e
      LEFT JOIN profiles p ON p.id = e.created_by
      WHERE e.mess_id = ${messId}::uuid
      ORDER BY e.created_at DESC
      LIMIT 3
    `,
    // 7. Recent deposits
    sql`
      SELECT d.id, d.amount, d.created_at, p.username
      FROM deposits d
      LEFT JOIN profiles p ON p.id = d.user_id
      WHERE d.mess_id = ${messId}::uuid
      ORDER BY d.created_at DESC
      LIMIT 3
    `,
    // 8. Routine
    sql`
      SELECT day_of_week, lunch, dinner
      FROM meal_routines
      WHERE mess_id = ${messId}::uuid
        AND day_of_week IN (${todayDow}, ${tomorrowDow})
    `,
    // 9. Emergency contacts
    sql`
      SELECT id, name, phone
      FROM emergency_contacts
      WHERE mess_id = ${messId}::uuid
      ORDER BY created_at ASC
    `,
    // 10. Balance & Stats calculation
    sql`
      SELECT * FROM calculate_member_balance(${messId}::uuid, ${currentMonth})
    `,
    // 11. Total Bazaar Spent
    sql`
      SELECT COALESCE(SUM(amount), 0)::numeric as total_spent
      FROM expenses
      WHERE mess_id = ${messId}::uuid
        AND date_trunc('month', date) = ${startOfMonth}::date
        AND expense_type = 'bazaar'
    `,
    // 12. Total Mess Meals
    sql`
      SELECT COALESCE(SUM(
        (CASE WHEN lunch THEN 1 ELSE 0 END) +
        (CASE WHEN dinner THEN 1 ELSE 0 END) +
        COALESCE(guest_lunch, 0) +
        COALESCE(guest_dinner, 0)
      ), 0)::numeric AS total_meals
      FROM meals
      WHERE mess_id = ${messId}::uuid
        AND date_trunc('month', date) = ${startOfMonth}::date
    `,
  ])

  const myBalance = balances.find((b: any) => b.user_id === userId)
  const totalSpent = Number(totalSpentRes[0]?.total_spent || 0)
  const totalMessMeals = Number(totalMealsRes[0]?.total_meals || 0)
  const mealRate = totalMessMeals > 0 ? totalSpent / totalMessMeals : 0

  const username = await profileNameFromUser(userId)

  return {
    myMeals: myMeals as any[],
    allMeals: allMeals as any[],
    notice: (notice[0] as any) || null,
    schedules: schedules.map((s: any) => ({
      date: s.assigned_date,
      username: s.username,
    })),
    unpaidFixedCount: unpaidFixed[0]?.count || 0,
    expenses: expenses as any[],
    deposits: deposits as any[],
    routines: routines as any[],
    contacts: contacts as any[],
    stats: {
      totalMeals: Number(myBalance?.total_meals || 0),
      balance: Number(myBalance?.balance || 0),
      mealRate,
      messTotalSpent: totalSpent,
    },
    isBazaarMan: schedules.some(
      (s: any) =>
        s.assigned_date === todayStr &&
        s.username?.toLowerCase() === username.toLowerCase()
    ),
  }
}

// Inline helper to check username by userId
async function profileNameFromUser(userId: string): Promise<string> {
  const rows = await sql`SELECT username FROM profiles WHERE id = ${userId}::uuid LIMIT 1`
  return rows[0]?.username || ''
}

export async function getActivityLogs(messId: string) {
  const userId = await getCurrentUserId()
  const access = await sql`
    SELECT 1 FROM mess_members
    WHERE mess_id = ${messId}::uuid AND user_id = ${userId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!access[0]) throw new Error('Access denied')

  const [expRes, depRes, noticeRes, memberRes] = await Promise.all([
    sql`
      SELECT e.id, e.amount, e.description, e.category, e.created_at, p.username
      FROM expenses e
      LEFT JOIN profiles p ON p.id = e.created_by
      WHERE e.mess_id = ${messId}::uuid
      ORDER BY e.created_at DESC
      LIMIT 20
    `,
    sql`
      SELECT d.id, d.amount, d.note, d.created_at, p.username
      FROM deposits d
      LEFT JOIN profiles p ON p.id = d.user_id
      WHERE d.mess_id = ${messId}::uuid
      ORDER BY d.created_at DESC
      LIMIT 20
    `,
    sql`
      SELECT n.id, n.message, n.created_at, p.username
      FROM notices n
      LEFT JOIN profiles p ON p.id = n.created_by
      WHERE n.mess_id = ${messId}::uuid
      ORDER BY n.created_at DESC
      LIMIT 20
    `,
    sql`
      SELECT mm.joined_at, mm.role, mm.status, p.username
      FROM mess_members mm
      LEFT JOIN profiles p ON p.id = mm.user_id
      WHERE mm.mess_id = ${messId}::uuid
      ORDER BY mm.joined_at DESC
      LIMIT 20
    `,
  ])

  return {
    expenses: expRes as any[],
    deposits: depRes as any[],
    notices: noticeRes as any[],
    members: memberRes as any[],
  }
}

