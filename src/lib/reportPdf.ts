import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import type { ReportData, ReportMemberRow, ReportMealRow } from './reportSettlements'

export type {
  ReportMemberRow,
  ReportFixedCostRow,
  ReportSettlement,
  ReportExpenseRow,
  ReportMealRow,
  ReportDepositRow,
  ReportData,
} from './reportSettlements'
export { computeSettlements } from './reportSettlements'

type RgbColor = [number, number, number]

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number }
}

// ── NexMess Brand Design Palette (RGB) ───────────────────────────────────────
const SAGE_PRIMARY: RgbColor = [74, 109, 86] // #4A6D56
const SAGE_DARK: RgbColor = [58, 86, 67] // #3A5643
const SAGE_LIGHT: RgbColor = [237, 242, 238] // #EDF2EE
const SAGE_MINT_TEXT: RgbColor = [214, 232, 219]
const CREAM_BG: RgbColor = [250, 245, 240] // #FAF5F0
const ZEBRA_BG: RgbColor = [252, 250, 247]
const CHARCOAL: RgbColor = [34, 30, 26] // #221E1A
const MUTED: RgbColor = [112, 103, 93] // #70675D
const SLATE_ACCENT: RgbColor = [71, 85, 105] // #475569
const BORDER: RgbColor = [228, 222, 214]
const EMERALD: RgbColor = [16, 150, 104]
const EMERALD_BG: RgbColor = [236, 253, 245]
const ROSE: RgbColor = [215, 38, 72]
const ROSE_BG: RgbColor = [255, 241, 242]
const WHITE: RgbColor = [255, 255, 255]

const MARGIN_X = 14
const TOP_MARGIN = 16
const BOTTOM_MARGIN = 22

/**
 * Parses `YYYY-MM-DD` (or ISO timestamps) strictly in local time so negative UTC
 * timezone offsets never shift report ledger dates back by one day.
 */
export function parseLocalDateStr(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim())
  if (match) {
    const [, y, m, d] = match
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  const fallback = new Date(dateStr)
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback
}

/**
 * Formats currency with comma separators using WinAnsi-safe `Tk` prefix.
 */
export function formatTk(amount: number, decimals = 2): string {
  const value = Number(amount) || 0
  const sign = value < 0 ? '-' : ''
  const absFormatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `Tk ${sign}${absFormatted}`
}

/**
 * Formats meal counts without ugly `.0` noise for whole numbers.
 */
export function formatMealValue(meals: number): string {
  const n = Math.round((Number(meals) || 0) * 100) / 100
  return Number.isInteger(n) ? n.toString() : n.toFixed(1)
}

/**
 * Normalizes characters unsupported by PDF Helvetica (WinAnsiEncoding)
 * such as star/arrow/taka symbols or curly quotes.
 */
export function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/৳/g, 'Tk ')
    .replace(/★/g, '*')
    .replace(/→/g, '->')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

/**
 * Produces a filesystem-safe download filename for all operating systems.
 */
export function sanitizePdfFilename(messName: string, month: string): string {
  const cleanName = sanitizePdfText(messName)
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const cleanMonth = month.replace(/[^0-9-]/g, '') || 'Report'
  return `NexMess_${cleanName || 'Mess'}_Financial_Record_${cleanMonth}.pdf`
}

function capitalizeWords(text: string): string {
  const clean = sanitizePdfText(text)
  if (!clean) return '-'
  return clean.replace(/\b[a-z]/g, (ch) => ch.toUpperCase())
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function getLastTableY(doc: JsPdfWithAutoTable, fallback: number): number {
  return doc.lastAutoTable?.finalY ?? fallback
}

export interface MealMatrixResult {
  headers: string[]
  rows: string[][]
  footers: string[]
}

/**
 * Builds the Daily Meal History Matrix in O(N) time by pre-indexing meal entries.
 */
export function buildMealMatrixData(
  days: Date[],
  members: ReportMemberRow[],
  dailyMeals: ReportMealRow[],
  totalMeals: number,
): MealMatrixResult {
  const cellLookup = new Map<string, Map<string, number>>()
  const dayTotals = new Map<string, number>()
  const memberTotals = new Map<string, number>()

  for (const r of dailyMeals) {
    const qty =
      (r.lunch ? 1 : 0) +
      (r.dinner ? 1 : 0) +
      (Number(r.guest_lunch) || 0) +
      (Number(r.guest_dinner) || 0)
    if (qty <= 0) continue

    const dateKey = r.date.slice(0, 10)
    let byUser = cellLookup.get(dateKey)
    if (!byUser) {
      byUser = new Map<string, number>()
      cellLookup.set(dateKey, byUser)
    }
    byUser.set(r.user_id, (byUser.get(r.user_id) || 0) + qty)
    dayTotals.set(dateKey, (dayTotals.get(dateKey) || 0) + qty)
    memberTotals.set(r.user_id, (memberTotals.get(r.user_id) || 0) + qty)
  }

  const headers = [
    'Date',
    ...members.map((m) => sanitizePdfText(m.username) || 'Member'),
    'Total',
  ]

  const rows = days.map((day) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    const byUser = cellLookup.get(dateKey)
    const cols = members.map((member) => {
      const qty = byUser?.get(member.user_id) || 0
      return qty > 0 ? formatMealValue(qty) : '-'
    })
    const dailyTotal = dayTotals.get(dateKey) || 0
    return [format(day, 'dd MMM (EEE)'), ...cols, dailyTotal > 0 ? formatMealValue(dailyTotal) : '-']
  })

  const footers = [
    'Total Meals',
    ...members.map((member) => formatMealValue(memberTotals.get(member.user_id) || 0)),
    formatMealValue(totalMeals),
  ]

  return { headers, rows, footers }
}

/**
 * Generates an executive-grade, branded NexMess monthly financial statement PDF.
 */
export function buildReportPdf(
  data: ReportData,
  options: { download?: boolean } = {},
): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4') as JsPdfWithAutoTable
  const generatedAt = new Date()

  const [yy, mm] = data.month.split('-').map(Number)
  const monthDate = new Date(yy || generatedAt.getFullYear(), (mm || 1) - 1, 1)
  const startDate = startOfMonth(monthDate)
  const endDate = endOfMonth(monthDate)
  const monthTitle = format(monthDate, 'MMMM yyyy')

  const getPageDimensions = () => ({
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  })

  const tableBaseMargin = { top: TOP_MARGIN, right: MARGIN_X, bottom: BOTTOM_MARGIN, left: MARGIN_X }

  const ensureSpace = (y: number, minSpace = 58): number => {
    const { height } = getPageDimensions()
    if (y > height - minSpace) {
      doc.addPage('a4', 'p')
      return TOP_MARGIN
    }
    return y
  }

  const addSectionTitle = (
    title: string,
    subtitle: string | undefined,
    y: number,
    minSpace = 58,
  ): number => {
    const nextY = ensureSpace(y, minSpace)
    const { width } = getPageDimensions()

    // Sage vertical pill accent on the left of the heading
    doc.setFillColor(...SAGE_PRIMARY)
    doc.roundedRect(MARGIN_X, nextY - 4.2, 1.6, 5.2, 0.7, 0.7, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CHARCOAL)
    doc.text(title, MARGIN_X + 4, nextY)

    if (subtitle) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      doc.text(subtitle, width - MARGIN_X, nextY, { align: 'right' })
    }

    return nextY + 4.5
  }

  // ── DOCUMENT METADATA ──────────────────────────────────────────────────────
  const safeMessName = sanitizePdfText(data.messName) || 'NexMess'
  const safeLocation = sanitizePdfText(data.messLocation)
  const safeGeneratedBy = sanitizePdfText(data.generatedBy) || 'System'

  doc.setProperties({
    title: `${safeMessName} - ${monthTitle} Financial Record`,
    subject: `Monthly Mess Financial Statement for ${monthTitle}`,
    author: safeGeneratedBy,
    creator: 'NexMess',
  })

  // ── HEADER HERO BANNER ─────────────────────────────────────────────────────
  const { width: portraitWidth } = getPageDimensions()
  const contentWidth = portraitWidth - MARGIN_X * 2

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const wrappedTitle = doc.splitTextToSize(safeMessName, contentWidth - 78) as string[]
  const wrappedLocation = safeLocation
    ? (doc.splitTextToSize(safeLocation, contentWidth - 78) as string[])
    : []

  const titleHeight = wrappedTitle.length * 6.2
  const locationHeight = wrappedLocation.length * 4
  const bannerHeight = Math.max(
    25,
    13.5 + titleHeight + (wrappedLocation.length > 0 ? locationHeight + 1.5 : 0),
  )
  const bannerY = 12

  doc.setFillColor(...SAGE_PRIMARY)
  doc.roundedRect(MARGIN_X, bannerY, contentWidth, bannerHeight, 3, 3, 'F')

  // Monogram badge
  doc.setFillColor(...WHITE)
  doc.roundedRect(MARGIN_X + 5, bannerY + 5, 9, 9, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SAGE_PRIMARY)
  doc.text('N', MARGIN_X + 9.5, bannerY + 11.2, { align: 'center' })

  const textLeftX = MARGIN_X + 18
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SAGE_MINT_TEXT)
  doc.text('NEXMESS  |  MONTHLY FINANCIAL STATEMENT', textLeftX, bannerY + 7.5)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(wrappedTitle, textLeftX, bannerY + 14)

  if (wrappedLocation.length > 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SAGE_MINT_TEXT)
    doc.text(wrappedLocation, textLeftX, bannerY + 14 + titleHeight)
  }

  // Right side of banner: Month + Archived pill
  const bannerRightX = MARGIN_X + contentWidth - 6
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(monthTitle, bannerRightX, bannerY + 11.5, { align: 'right' })

  if (data.isArchived) {
    const badgeW = 34
    const badgeH = 5.5
    const badgeX = bannerRightX - badgeW
    const badgeY = bannerY + 14.5
    doc.setFillColor(...EMERALD)
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text('ARCHIVED RECORD', badgeX + badgeW / 2, badgeY + 3.8, { align: 'center' })
  } else {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SAGE_MINT_TEXT)
    doc.text('Live Monthly Statement', bannerRightX, bannerY + 17.5, { align: 'right' })
  }

  // ── METADATA BAR ───────────────────────────────────────────────────────────
  const metaY = bannerY + bannerHeight + 5.5
  const generatedDisplay = format(generatedAt, 'yyyy-MM-dd hh:mm a')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`Generated: ${generatedDisplay}  |  Prepared by: ${safeGeneratedBy}`, MARGIN_X, metaY)
  doc.text(pluralize(data.members.length, 'Member', 'Members'), portraitWidth - MARGIN_X, metaY, {
    align: 'right',
  })

  // ── KPI STAT CARDS (4-COLUMN EXECUTIVE OVERVIEW) ───────────────────────────
  const perPersonFixedCost =
    data.financeMembersCount > 0 ? data.totalFixed / data.financeMembersCount : 0
  const totalBazaarAndFixed = data.totalExpenses + data.totalFixed
  const messBalance = data.totalDeposits - totalBazaarAndFixed
  const expenseCount = data.dailyExpenses?.length || 0
  const depositCount = data.dailyDeposits?.length || 0

  const kpiY = metaY + 4
  const cardGap = 3
  const cardW = (contentWidth - cardGap * 3) / 4
  const cardH = 19

  const kpiCards: {
    label: string
    value: string
    sub: string
    accent: RgbColor
    valueColor?: RgbColor
  }[] = [
    {
      label: 'BAZAAR EXPENSES',
      value: formatTk(data.totalExpenses),
      sub: pluralize(expenseCount, 'logged entry', 'logged entries'),
      accent: SAGE_PRIMARY,
    },
    {
      label: 'FIXED COSTS',
      value: formatTk(data.totalFixed),
      sub: `${formatTk(perPersonFixedCost)} / member`,
      accent: SLATE_ACCENT,
    },
    {
      label: 'VERIFIED DEPOSITS',
      value: formatTk(data.totalDeposits),
      sub: pluralize(depositCount, 'confirmed deposit', 'confirmed deposits'),
      accent: EMERALD,
      valueColor: EMERALD,
    },
    {
      label: 'NET BALANCE',
      value: formatTk(messBalance),
      sub: messBalance >= 0 ? 'Treasury Surplus' : 'Treasury Deficit',
      accent: messBalance >= 0 ? EMERALD : ROSE,
      valueColor: messBalance >= 0 ? EMERALD : ROSE,
    },
  ]

  kpiCards.forEach((card, idx) => {
    const x = MARGIN_X + idx * (cardW + cardGap)
    doc.setFillColor(...CREAM_BG)
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, kpiY, cardW, cardH, 2, 2, 'FD')

    // Top accent bar
    doc.setFillColor(...card.accent)
    doc.roundedRect(x, kpiY, cardW, 1.4, 0.7, 0.7, 'F')

    doc.setFontSize(6.8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MUTED)
    doc.text(card.label, x + 3, kpiY + 5.6)

    // Shrink figure slightly only if an unusually large currency string exceeds card width
    let valueFontSize = 10.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(valueFontSize)
    while (doc.getTextWidth(card.value) > cardW - 6 && valueFontSize > 7.5) {
      valueFontSize -= 0.5
      doc.setFontSize(valueFontSize)
    }
    doc.setTextColor(...(card.valueColor || CHARCOAL))
    doc.text(card.value, x + 3, kpiY + 11.6)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(card.sub, x + 3, kpiY + 16.2)
  })

  // ── MEAL METRICS HIGHLIGHT STRIP ───────────────────────────────────────────
  const stripY = kpiY + cardH + 3.5
  const stripH = 10.5
  doc.setFillColor(...SAGE_LIGHT)
  doc.setDrawColor(207, 220, 211)
  doc.setLineWidth(0.25)
  doc.roundedRect(MARGIN_X, stripY, contentWidth, stripH, 2, 2, 'FD')

  const stripMetrics = [
    { label: 'Total Meals Served', value: formatMealValue(data.totalMeals) },
    { label: 'Mess Meal Rate', value: `${formatTk(data.mealRate)} / meal` },
    { label: 'Total Monthly Outflow', value: formatTk(totalBazaarAndFixed) },
  ]
  const colSpan = contentWidth / 3
  stripMetrics.forEach((item, idx) => {
    const colX = MARGIN_X + idx * colSpan + 4
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`${item.label}:`, colX, stripY + 6.5)

    const labelWidth = doc.getTextWidth(`${item.label}: `)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SAGE_DARK)
    doc.text(item.value, colX + labelWidth + 1, stripY + 6.5)
  })

  let currentY = stripY + stripH + 8.5

  // ── 1. MEMBER FINANCIAL BREAKDOWNS ─────────────────────────────────────────
  currentY = addSectionTitle(
    'Member Financial Breakdowns',
    `Fixed share: ${formatTk(perPersonFixedCost)} each`,
    currentY,
  )

  let sumMeals = 0
  let sumMealCost = 0
  let sumFixed = 0
  let sumTotalExp = 0
  let sumDeposited = 0
  let sumBalance = 0

  const memberBody = data.members.map((m) => {
    const mealCost = Number(m.mealCost) || 0
    const deposited = Number(m.deposited) || 0
    const meals = Number(m.meals) || 0
    const totalExp = mealCost + perPersonFixedCost
    const realBalance = deposited - totalExp

    sumMeals += meals
    sumMealCost += mealCost
    sumFixed += perPersonFixedCost
    sumTotalExp += totalExp
    sumDeposited += deposited
    sumBalance += realBalance

    const displayName =
      (sanitizePdfText(m.username) || 'Unknown') + (m.status === 'left' ? ' (Left)' : '')

    return [
      displayName,
      formatMealValue(meals),
      formatTk(mealCost),
      formatTk(perPersonFixedCost),
      formatTk(totalExp),
      formatTk(deposited),
      {
        content: formatTk(realBalance),
        styles: {
          fontStyle: 'bold' as const,
          textColor: realBalance >= 0 ? EMERALD : ROSE,
          fillColor: realBalance >= 0 ? EMERALD_BG : ROSE_BG,
        },
      },
    ]
  })

  autoTable(doc, {
    startY: currentY,
    margin: tableBaseMargin,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    head: [
      ['Member', 'Meals', 'Meal Cost', 'Fixed Share', 'Total Cost', 'Deposited', 'Net Balance'],
    ],
    body: memberBody,
    foot: [
      [
        'Total',
        formatMealValue(sumMeals),
        formatTk(sumMealCost),
        formatTk(sumFixed),
        formatTk(sumTotalExp),
        formatTk(sumDeposited),
        formatTk(sumBalance),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: SAGE_PRIMARY, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: SAGE_LIGHT, textColor: SAGE_DARK, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: ZEBRA_BG },
    styles: {
      cellPadding: 2.3,
      fontSize: 8,
      textColor: CHARCOAL,
      lineColor: BORDER,
      lineWidth: 0.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 24, halign: 'right' },
      3: { cellWidth: 23, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right', textColor: EMERALD },
      6: { cellWidth: 27, halign: 'right' },
    },
  })
  currentY = getLastTableY(doc, currentY) + 8

  // ── 2. SETTLEMENT TRANSFER PLAN ────────────────────────────────────────────
  if (data.settlements.length > 0) {
    currentY = addSectionTitle(
      'Settlement Transfer Plan',
      pluralize(data.settlements.length, 'transfer', 'transfers'),
      currentY,
    )
    autoTable(doc, {
      startY: currentY,
      margin: tableBaseMargin,
      showHead: 'everyPage',
      head: [['From (Payer)', 'Action', 'To (Recipient)', 'Amount']],
      body: data.settlements.map((t) => [
        sanitizePdfText(t.from) || 'Member',
        'Pays ->',
        sanitizePdfText(t.to) || 'Member',
        formatTk(t.amount, 0),
      ]),
      theme: 'grid',
      headStyles: { fillColor: EMERALD, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ZEBRA_BG },
      styles: {
        cellPadding: 2.2,
        fontSize: 8.5,
        textColor: CHARCOAL,
        lineColor: BORDER,
        lineWidth: 0.2,
      },
      columnStyles: {
        1: { cellWidth: 20, halign: 'center', textColor: MUTED, fontStyle: 'bold' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: CHARCOAL },
      },
    })
    currentY = getLastTableY(doc, currentY) + 8
  } else if (data.members.length > 0) {
    currentY = ensureSpace(currentY, 34)
    doc.setFillColor(...EMERALD_BG)
    doc.setDrawColor(167, 243, 208)
    doc.roundedRect(MARGIN_X, currentY, contentWidth, 9, 2, 2, 'FD')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...EMERALD)
    doc.text(
      'All member accounts are balanced - no pending settlement transfers.',
      MARGIN_X + contentWidth / 2,
      currentY + 5.8,
      { align: 'center' },
    )
    currentY += 15
  }

  // ── 3. MONTHLY FIXED COSTS ─────────────────────────────────────────────────
  if (data.fixedCosts.length > 0) {
    currentY = addSectionTitle(
      'Monthly Fixed Costs',
      pluralize(data.fixedCosts.length, 'item', 'items'),
      currentY,
    )
    autoTable(doc, {
      startY: currentY,
      margin: tableBaseMargin,
      showHead: 'everyPage',
      showFoot: 'lastPage',
      head: [['Fixed Cost Category / Description', 'Amount']],
      body: data.fixedCosts.map((fc) => [capitalizeWords(fc.description), formatTk(fc.amount)]),
      foot: [['Total Fixed Costs', formatTk(data.totalFixed)]],
      theme: 'grid',
      headStyles: { fillColor: SLATE_ACCENT, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: SAGE_LIGHT, textColor: SAGE_DARK, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: ZEBRA_BG },
      styles: {
        cellPadding: 2.2,
        fontSize: 8.5,
        textColor: CHARCOAL,
        lineColor: BORDER,
        lineWidth: 0.2,
      },
      columnStyles: { 1: { cellWidth: 34, halign: 'right', fontStyle: 'bold' } },
    })
    currentY = getLastTableY(doc, currentY) + 8
  }

  // ── 4. DAILY BAZAAR EXPENSES LOG ───────────────────────────────────────────
  if (data.dailyExpenses && data.dailyExpenses.length > 0) {
    const sortedExpenses = [...data.dailyExpenses].sort((a, b) => a.date.localeCompare(b.date))
    currentY = addSectionTitle(
      'Daily Bazaar Expenses Log',
      pluralize(sortedExpenses.length, 'entry', 'entries'),
      currentY,
    )

    autoTable(doc, {
      startY: currentY,
      margin: tableBaseMargin,
      showHead: 'everyPage',
      showFoot: 'lastPage',
      head: [['Date', 'Category', 'Description', 'Logged By', 'Amount']],
      body: sortedExpenses.map((e) => [
        format(parseLocalDateStr(e.date), 'dd MMM yyyy'),
        capitalizeWords(e.category || 'Bazaar'),
        sanitizePdfText(e.description) || '-',
        sanitizePdfText(e.logged_by) || 'Unknown',
        formatTk(e.amount),
      ]),
      foot: [
        [
          { content: 'Total Bazaar Expenses', colSpan: 4, styles: { halign: 'right' } },
          formatTk(data.totalExpenses),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: SAGE_PRIMARY, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: SAGE_LIGHT, textColor: SAGE_DARK, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: ZEBRA_BG },
      styles: {
        cellPadding: 2.1,
        fontSize: 8,
        textColor: CHARCOAL,
        lineColor: BORDER,
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 21 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30 },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
    })
    currentY = getLastTableY(doc, currentY) + 8
  }

  // ── 5. DAILY VERIFIED DEPOSITS LOG ─────────────────────────────────────────
  if (data.dailyDeposits && data.dailyDeposits.length > 0) {
    const sortedDeposits = [...data.dailyDeposits].sort((a, b) => a.date.localeCompare(b.date))
    currentY = addSectionTitle(
      'Daily Verified Deposits Log',
      pluralize(sortedDeposits.length, 'deposit', 'deposits'),
      currentY,
    )

    autoTable(doc, {
      startY: currentY,
      margin: tableBaseMargin,
      showHead: 'everyPage',
      showFoot: 'lastPage',
      head: [['Date', 'Member', 'Note / Reference', 'Amount']],
      body: sortedDeposits.map((d) => [
        format(parseLocalDateStr(d.date), 'dd MMM yyyy'),
        sanitizePdfText(d.username) || 'Member',
        sanitizePdfText(d.note) || '-',
        formatTk(d.amount),
      ]),
      foot: [
        [
          { content: 'Total Deposits Collected', colSpan: 3, styles: { halign: 'right' } },
          formatTk(data.totalDeposits),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: EMERALD, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: EMERALD_BG, textColor: EMERALD, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: ZEBRA_BG },
      styles: {
        cellPadding: 2.1,
        fontSize: 8,
        textColor: CHARCOAL,
        lineColor: BORDER,
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: EMERALD },
      },
    })
    currentY = getLastTableY(doc, currentY) + 8
  }

  // ── 6. DAILY MEAL HISTORY MATRIX ───────────────────────────────────────────
  if (data.dailyMeals && data.dailyMeals.length > 0 && data.members.length > 0) {
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const matrix = buildMealMatrixData(days, data.members, data.dailyMeals, data.totalMeals)

    // Switch wide messes (> 8 members) to an A4 Landscape page so columns stay crisp
    const useLandscape = data.members.length > 8
    const matrixTopMargin = useLandscape ? 14 : TOP_MARGIN
    const matrixBottomMargin = useLandscape ? 18 : BOTTOM_MARGIN

    if (useLandscape) {
      doc.addPage('a4', 'l')
      currentY = matrixTopMargin
    } else {
      currentY = ensureSpace(currentY, 68)
    }

    currentY = addSectionTitle(
      'Daily Meal History Matrix',
      `${days.length} days · ${data.members.length} members`,
      currentY,
      68,
    )

    const matrixFontSize = data.members.length > 12 ? 6.2 : 6.8
    const totalColIdx = matrix.headers.length - 1

    autoTable(doc, {
      startY: currentY,
      margin: {
        top: matrixTopMargin,
        right: MARGIN_X,
        bottom: matrixBottomMargin,
        left: MARGIN_X,
      },
      showHead: 'everyPage',
      showFoot: 'lastPage',
      head: [matrix.headers],
      body: matrix.rows,
      foot: [matrix.footers],
      theme: 'grid',
      headStyles: {
        fillColor: SAGE_PRIMARY,
        textColor: WHITE,
        fontSize: matrixFontSize,
        fontStyle: 'bold',
        halign: 'center',
      },
      footStyles: {
        fillColor: SAGE_LIGHT,
        textColor: SAGE_DARK,
        fontStyle: 'bold',
        fontSize: matrixFontSize,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: ZEBRA_BG },
      styles: {
        cellPadding: { top: 0.95, right: 1.2, bottom: 0.95, left: 1.2 },
        fontSize: matrixFontSize,
        halign: 'center',
        valign: 'middle',
        textColor: CHARCOAL,
        lineColor: BORDER,
        lineWidth: 0.18,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 23, fontStyle: 'bold' },
        [totalColIdx]: { halign: 'right', fontStyle: 'bold', cellWidth: 15 },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.cell.raw === '-') {
          hookData.cell.styles.textColor = [175, 168, 160]
        }
      },
    })
  }

  // ── FOOTER & PAGE NUMBER STAMPING ──────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  const footerStamp = format(generatedAt, 'yyyy-MM-dd HH:mm')

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const { width, height } = getPageDimensions()

    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.line(MARGIN_X, height - 13, width - MARGIN_X, height - 13)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(
      `NexMess Financial Record  |  ${monthTitle}  |  Generated: ${footerStamp}`,
      MARGIN_X,
      height - 8.5,
    )
    doc.text(`Page ${i} of ${totalPages}`, width - MARGIN_X, height - 8.5, { align: 'right' })
  }

  if (options.download !== false) {
    doc.save(sanitizePdfFilename(data.messName, data.month))
  }
  return doc
}
