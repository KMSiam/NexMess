'use server'

import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { pusherServer, getMessChannel, EVENTS } from '@/lib/pusher'
import { getDbUserId } from '@/actions/profile'
import type { Expense, Deposit, FixedCost, MemberBalance } from '@/types/database'
import { format, endOfMonth } from 'date-fns'

async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getDbUserId(userId)
}

async function verifyMember(userId: string, messId: string): Promise<'member' | 'manager'> {
  const rows = await sql`
    SELECT role FROM mess_members
    WHERE user_id = ${userId}::uuid AND mess_id = ${messId}::uuid AND status = 'approved'
    LIMIT 1
  `
  if (!rows[0]) throw new Error('Access denied')
  return rows[0].role as 'member' | 'manager'
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function getExpenses(messId: string, month: string): Promise<Expense[]> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const start = `${month}-01`
  const rows = await sql`
    SELECT e.*, row_to_json(p) as profiles
    FROM expenses e
    LEFT JOIN profiles p ON p.id = e.created_by
    WHERE e.mess_id = ${messId}::uuid
      AND date_trunc('month', e.date) = ${start}::date
    ORDER BY e.date DESC, e.created_at DESC
  `
  return rows as Expense[]
}

export async function addExpense(
  messId: string,
  data: {
    amount: number
    category: string
    description?: string
    date: string
    expense_type?: 'bazaar' | 'fixed' | 'other'
    receipt_url?: string
  }
): Promise<Expense> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    INSERT INTO expenses (mess_id, created_by, amount, category, description, date, expense_type, receipt_url, created_at)
    VALUES (
      ${messId}::uuid, ${userId}::uuid,
      ${data.amount}, ${data.category}, ${data.description ?? null},
      ${data.date}::date, ${data.expense_type ?? 'bazaar'}, ${data.receipt_url ?? null}, now()
    )
    RETURNING *
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'expenses' })
  return rows[0] as Expense
}

export async function updateExpense(
  messId: string,
  expenseId: string,
  data: {
    amount: number
    category: string
    description?: string
    expense_type?: 'bazaar' | 'fixed' | 'other'
  }
): Promise<Expense> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    UPDATE expenses
    SET
      amount = ${data.amount},
      category = ${data.category},
      description = ${data.description ?? null},
      expense_type = ${data.expense_type ?? 'bazaar'}
    WHERE id = ${expenseId}::uuid AND mess_id = ${messId}::uuid
    RETURNING *
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'expenses' })
  return rows[0] as Expense
}

export async function deleteExpense(messId: string, expenseId: string): Promise<void> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can delete expenses')

  await sql`
    DELETE FROM expenses WHERE id = ${expenseId}::uuid AND mess_id = ${messId}::uuid
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'expenses' })
}

// ─── Deposits ────────────────────────────────────────────────────────────────

export async function getDeposits(messId: string, month: string): Promise<Deposit[]> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const start = `${month}-01`
  const rows = await sql`
    SELECT d.*, row_to_json(p) as profiles
    FROM deposits d
    LEFT JOIN profiles p ON p.id = d.user_id
    WHERE d.mess_id = ${messId}::uuid
      AND date_trunc('month', d.date) = ${start}::date
    ORDER BY d.date DESC
  `
  return rows as Deposit[]
}

export async function addDeposit(
  messId: string,
  data: { userId: string; amount: number; date: string; note?: string }
): Promise<Deposit> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  
  // Managers can add deposits for anyone; regular members can only add for themselves
  if (role !== 'manager' && data.userId !== userId) {
    throw new Error('Unauthorized')
  }

  const rows = await sql`
    INSERT INTO deposits (mess_id, user_id, amount, date, note, verified, created_at)
    VALUES (${messId}::uuid, ${data.userId}::uuid, ${data.amount}, ${data.date}::date, ${data.note ?? null}, false, now())
    RETURNING *
  `

  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'deposits' })
  return rows[0] as Deposit
}

export async function verifyDeposit(messId: string, depositId: string): Promise<void> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can verify deposits')

  await sql`
    UPDATE deposits
    SET verified = true, verified_by = ${userId}::uuid
    WHERE id = ${depositId}::uuid AND mess_id = ${messId}::uuid
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'deposits' })
}

export async function deleteDeposit(messId: string, depositId: string): Promise<void> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can delete deposits')

  await sql`DELETE FROM deposits WHERE id = ${depositId}::uuid AND mess_id = ${messId}::uuid`
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'deposits' })
}

// ─── Fixed Costs ─────────────────────────────────────────────────────────────

export async function getFixedCosts(messId: string, month: string): Promise<FixedCost[]> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    SELECT * FROM fixed_costs WHERE mess_id = ${messId}::uuid AND month = ${month}
    ORDER BY created_at DESC
  `
  return rows as FixedCost[]
}

export async function addFixedCost(
  messId: string,
  data: {
    category: FixedCost['category']
    label?: string
    amount: number
    month: string
  }
): Promise<FixedCost> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can add fixed costs')

  const rows = await sql`
    INSERT INTO fixed_costs (mess_id, created_by, category, label, amount, month, is_paid)
    VALUES (${messId}::uuid, ${userId}::uuid, ${data.category}, ${data.label ?? null}, ${data.amount}, ${data.month}, false)
    RETURNING *
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'fixed_costs' })
  return rows[0] as FixedCost
}

export async function updateFixedCost(
  messId: string,
  fixedCostId: string,
  data: {
    category: FixedCost['category']
    label?: string
    amount: number
  }
): Promise<FixedCost> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can update fixed costs')

  const rows = await sql`
    UPDATE fixed_costs
    SET
      category = ${data.category},
      label = ${data.label ?? null},
      amount = ${data.amount}
    WHERE id = ${fixedCostId}::uuid AND mess_id = ${messId}::uuid
    RETURNING *
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'fixed_costs' })
  return rows[0] as FixedCost
}

export async function deleteFixedCost(messId: string, fixedCostId: string): Promise<void> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can delete fixed costs')

  await sql`
    DELETE FROM fixed_costs WHERE id = ${fixedCostId}::uuid AND mess_id = ${messId}::uuid
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'fixed_costs' })
}

export async function markFixedCostPaid(messId: string, fixedCostId: string): Promise<void> {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can mark fixed costs paid')

  await sql`
    UPDATE fixed_costs
    SET is_paid = true
    WHERE id = ${fixedCostId}::uuid AND mess_id = ${messId}::uuid
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'fixed_costs' })
}

// ─── Member Balances (RPC equivalent) ────────────────────────────────────────

export async function getMemberBalances(
  messId: string,
  month: string
): Promise<MemberBalance[]> {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const rows = await sql`
    SELECT * FROM calculate_member_balance(${messId}::uuid, ${month})
  `
  return rows as MemberBalance[]
}

// ─── Monthly Reports ─────────────────────────────────────────────────────────

export async function getMonthlyReports(messId: string) {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can view monthly reports history')

  const rows = await sql`
    SELECT * FROM monthly_reports
    WHERE mess_id = ${messId}::uuid
    ORDER BY month DESC
  `
  return rows as any[]
}

export async function generateMonthlyReport(messId: string, month: string) {
  const userId = await getCurrentUserId()
  const role = await verifyMember(userId, messId)
  if (role !== 'manager') throw new Error('Only managers can generate monthly reports')

  await sql`
    SELECT generate_monthly_report(${messId}::uuid, ${month})
  `
  await pusherServer.trigger(getMessChannel(messId), EVENTS.DB_CHANGE, { table: 'monthly_reports' })
}

export async function getDailyMealsForMonth(messId: string, month: string) {
  const userId = await getCurrentUserId()
  await verifyMember(userId, messId)

  const monthStartStr = `${month}-01`
  const monthEndStr = format(endOfMonth(new Date(monthStartStr)), 'yyyy-MM-dd')

  const rows = await sql`
    SELECT m.date, m.user_id, m.lunch, m.dinner, m.guest_lunch, m.guest_dinner, p.username
    FROM meals m
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.mess_id = ${messId}::uuid
      AND m.date >= ${monthStartStr}::date
      AND m.date <= ${monthEndStr}::date
  `
  return rows as any[]
}
