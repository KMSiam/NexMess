import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export interface ReportMemberRow {
  user_id: string
  username: string
  status?: 'pending' | 'approved' | 'left'
  meals: number
  mealCost: number
  deposited: number
}

export interface ReportFixedCostRow {
  description: string
  amount: number
}

export interface ReportSettlement {
  from: string
  to: string
  amount: number
}

export interface ReportData {
  messName: string
  messLocation?: string | null
  month: string // 'YYYY-MM'
  generatedBy?: string // username, or 'Auto'/'Manager'
  isArchived?: boolean // header wording
  // Global summary
  totalExpenses: number
  totalDeposits: number
  totalFixed: number
  mealRate: number
  totalMeals: number
  // Rows
  financeMembersCount: number // for per-person fixed-cost split
  members: ReportMemberRow[]
  fixedCosts: ReportFixedCostRow[]
  settlements: ReportSettlement[]
  // Details
  dailyExpenses?: {
    date: string
    category?: string
    description?: string
    amount: number
    logged_by?: string
  }[]
  dailyMeals?: {
    date: string
    username: string
    user_id: string
    lunch: boolean
    dinner: boolean
    guest_lunch: number
    guest_dinner: number
  }[]
  dailyDeposits?: {
    date: string
    username: string
    amount: number
    note: string
  }[]
}

const tk = (n: number) => `Tk ${Number(n || 0).toFixed(2)}`

/**
 * Overhauled monthly report PDF generator.
 */
export function buildReportPdf(data: ReportData): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  const [yy, mm] = data.month.split('-').map(Number)
  const monthDate = new Date(yy, (mm || 1) - 1, 1)
  const startDate = startOfMonth(monthDate)
  const endDate = endOfMonth(monthDate)

  // Helper: Draw Section Title with Accent Line
  const addSectionTitle = (title: string, y: number) => {
    if (y > pageHeight - 35) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42) // Slate 900
    doc.text(title, 14, y)

    // Highlight line below section title
    doc.setDrawColor(59, 130, 246) // Blue 500
    doc.setLineWidth(0.6)
    doc.line(14, y + 2, 35, y + 2)

    return y + 8
  }

  // ── PAGE 1: EXECUTIVE FINANCE SUMMARY ──────────────────────────────────────

  // Header Wording
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42) // Slate 900
  doc.text(data.messName, 14, 22)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  if (data.messLocation) {
    doc.text(`Address: ${data.messLocation}`, 14, 27)
  }

  const generatedTimeStr = format(new Date(), 'yyyy-MM-dd hh:mm a')
  doc.text(
    `Month: ${format(monthDate, 'MMMM yyyy')}  |  Generated: ${generatedTimeStr}  |  By: ${data.generatedBy || 'System'}`,
    14,
    data.messLocation ? 32 : 28
  )

  if (data.isArchived) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 185, 129) // Emerald 500
    doc.text(`★ Permanent Historical Record`, 14, data.messLocation ? 37 : 33)
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.setLineWidth(0.5)
  const headerBottomY = data.isArchived ? (data.messLocation ? 41 : 37) : (data.messLocation ? 36 : 32)
  doc.line(14, headerBottomY, pageWidth - 14, headerBottomY)

  // Executive Summary Title
  let currentY = addSectionTitle('Executive Monthly Summary', headerBottomY + 10)

  // Financial Summary Table (Replica of UI's Summary Tab)
  const perPersonFixedCost =
    data.financeMembersCount > 0 ? data.totalFixed / data.financeMembersCount : 0
  const totalBazaarAndFixed = data.totalExpenses + data.totalFixed
  const messBalance = data.totalDeposits - totalBazaarAndFixed

  autoTable(doc, {
    startY: currentY,
    head: [['Financial Metric', 'Value / Summary']],
    body: [
      ['Total Bazaar Expenses', tk(data.totalExpenses)],
      ['Total Fixed Costs', tk(data.totalFixed)],
      ['Total Monthly Cost (Bazaar + Fixed)', tk(totalBazaarAndFixed)],
      ['Total Verified Deposits Collected', tk(data.totalDeposits)],
      ['Net Treasury Balance (Surplus / Deficit)', {
        content: tk(messBalance),
        styles: { fontStyle: 'bold', textColor: messBalance >= 0 ? [16, 185, 129] : [239, 68, 68] }
      }],
      ['Total Meals Served in Mess', data.totalMeals.toString()],
      ['Mess Meal Rate (Bazaar Cost / Total Meals)', tk(data.mealRate)],
      ['Fixed Cost Share (Per Member)', tk(perPersonFixedCost)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 }, // Slate 900
    styles: { cellPadding: 2.5, fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } }
  })

  currentY = (doc as any).lastAutoTable.finalY + 12

  // Fixed Costs List
  if (data.fixedCosts.length > 0) {
    currentY = addSectionTitle('Monthly Fixed Costs', currentY)
    autoTable(doc, {
      startY: currentY,
      head: [['Fixed Cost Label / Category', 'Amount']],
      body: data.fixedCosts.map((fc) => [fc.description, tk(fc.amount)]),
      foot: [['Total Fixed Costs', tk(data.totalFixed)]],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 }, // Blue 500
      footStyles: { fillColor: [241, 245, 249], textColor: 15, fontStyle: 'bold' },
      styles: { cellPadding: 2.2, fontSize: 8.5 },
      columnStyles: { 1: { halign: 'right' } }
    })
    currentY = (doc as any).lastAutoTable.finalY + 12
  }

  // Settle-up sheet
  if (data.settlements.length > 0) {
    currentY = addSectionTitle('Settlement Transfer Plan (Who Pays Whom)', currentY)
    autoTable(doc, {
      startY: currentY,
      head: [['From (Debtor)', '', 'To (Creditor)', 'Amount']],
      body: data.settlements.map((t) => [t.from, '→', t.to, `Tk ${t.amount.toFixed(0)}`]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 }, // Emerald 500
      styles: { cellPadding: 2.2, fontSize: 8.5 },
      columnStyles: { 1: { halign: 'center', textColor: 100 }, 3: { halign: 'right', fontStyle: 'bold' } }
    })
  }


  // ── PAGE 2: MEMBER DETAIL BREAKDOWN ────────────────────────────────────────
  doc.addPage()
  
  currentY = addSectionTitle('Member Financial Breakdowns', 20)
  autoTable(doc, {
    startY: currentY,
    head: [['Member Name', 'Total Meals', 'Meal Cost', 'Fixed Cost', 'Total Exp', 'Deposited', 'Net Balance']],
    body: data.members.map((m) => {
      const totalExp = m.mealCost + perPersonFixedCost
      const realBalance = m.deposited - totalExp
      return [
        (m.username || 'Unknown') + (m.status === 'left' ? ' (Left)' : ''),
        m.meals.toString(),
        tk(m.mealCost),
        tk(perPersonFixedCost),
        tk(totalExp),
        tk(m.deposited),
        {
          content: tk(realBalance),
          styles: { fontStyle: 'bold', textColor: realBalance >= 0 ? [16, 185, 129] : [239, 68, 68] }
        }
      ]
    }),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255 }, // Indigo 600
    styles: { cellPadding: 2.5, fontSize: 8.5 },
    columnStyles: { 
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    }
  })

  currentY = (doc as any).lastAutoTable.finalY + 25

  // Verification & Signature block
  if (currentY > pageHeight - 45) {
    doc.addPage()
    currentY = 30
  }
  
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  
  // Manager Signature Line
  doc.line(20, currentY, 80, currentY)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text('Prepared By: Mess Manager', 20, currentY + 4)
  doc.text('Name: ______________________', 20, currentY + 8)

  // Representative Signature Line
  doc.line(pageWidth - 80, currentY, pageWidth - 20, currentY)
  doc.text('Verified By: Member Representative', pageWidth - 80, currentY + 4)
  doc.text('Name: ______________________', pageWidth - 80, currentY + 8)


  // ── PAGE 3: DAILY BAZAAR EXPENSES LOG ──────────────────────────────────────
  if (data.dailyExpenses && data.dailyExpenses.length > 0) {
    doc.addPage()
    currentY = addSectionTitle('Daily Bazaar Expenses Log', 20)

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Category', 'Description', 'Logged By', 'Amount']],
      body: data.dailyExpenses.map((e) => [
        format(new Date(e.date), 'dd MMM yyyy'),
        e.category || '-',
        e.description || '-',
        e.logged_by || 'Unknown',
        tk(e.amount)
      ]),
      foot: [['', '', '', 'Total Bazaar Expenses', tk(data.totalExpenses)]],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 }, // Blue 500
      footStyles: { fillColor: [241, 245, 249], textColor: 15, fontStyle: 'bold' },
      styles: { cellPadding: 2.2, fontSize: 8.5 },
      columnStyles: { 4: { halign: 'right' } }
    })
  }

  // ── PAGE 4: DAILY DEPOSITS LOG ─────────────────────────────────────────────
  if (data.dailyDeposits && data.dailyDeposits.length > 0) {
    doc.addPage()
    currentY = addSectionTitle('Daily Verified Deposits Log', 20)

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Member', 'Note / Reference', 'Amount']],
      body: data.dailyDeposits.map((d) => [
        format(new Date(d.date), 'dd MMM yyyy'),
        d.username,
        d.note || '-',
        tk(d.amount)
      ]),
      foot: [['', '', 'Total Deposits Collected', tk(data.totalDeposits)]],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 }, // Emerald 500
      footStyles: { fillColor: [241, 245, 249], textColor: 15, fontStyle: 'bold' },
      styles: { cellPadding: 2.2, fontSize: 8.5 },
      columnStyles: { 3: { halign: 'right' } }
    })
  }

  // ── PAGE 5: DAILY MEAL HISTORY MATRIX ──────────────────────────────────────
  if (data.dailyMeals && data.dailyMeals.length > 0) {
    doc.addPage()
    currentY = addSectionTitle('Daily Meal History Matrix', 20)

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const matrixMembers = data.members

    const matrixHeaders = ['Date', ...matrixMembers.map(m => m.username), 'Daily Total']
    
    const matrixRows = days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayMeals = data.dailyMeals!.filter((m) => m.date === dateStr)
      
      const cols = matrixMembers.map((member) => {
        const record = dayMeals.find((m) => m.user_id === member.user_id)
        if (!record) return '-'
        const total = (record.lunch ? 1 : 0) + (record.dinner ? 1 : 0) + record.guest_lunch + record.guest_dinner
        return total > 0 ? total.toString() : '-'
      })

      const dailyTotal = dayMeals.reduce((sum, r) => {
        return sum + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0) + r.guest_lunch + r.guest_dinner
      }, 0)

      return [format(day, 'dd MMM (EEE)'), ...cols, dailyTotal > 0 ? dailyTotal.toFixed(1) : '-']
    })

    const matrixFooters = [
      'Total Meals',
      ...matrixMembers.map((member) => {
        const total = data.dailyMeals!
          .filter((m) => m.user_id === member.user_id)
          .reduce(
            (sum, r) =>
              sum + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0) + r.guest_lunch + r.guest_dinner,
            0
          )
        return total.toFixed(1)
      }),
      data.totalMeals.toFixed(1)
    ]

    autoTable(doc, {
      startY: currentY,
      head: [matrixHeaders],
      body: matrixRows,
      foot: [matrixFooters],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'center' },
      footStyles: { fillColor: [241, 245, 249], textColor: 15, fontStyle: 'bold', fontSize: 7, halign: 'center' },
      styles: { cellPadding: 1.5, fontSize: 6.5, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 22 },
        [matrixHeaders.length - 1]: { halign: 'right', fontStyle: 'bold', cellWidth: 16 }
      }
    })
  }

  // ── FOOTER & PAGE NUMBER STAMPING ──────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)

    // Page X of Y bottom-right
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 25,
      pageHeight - 9
    )

    // branding & timestamp bottom-left
    doc.text(
      `NexMess Financial Record  |  Month: ${format(monthDate, 'MMMM yyyy')}  |  Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      14,
      pageHeight - 9
    )

    // Footer border line
    doc.setDrawColor(226, 232, 240) // Slate 200
    doc.setLineWidth(0.25)
    doc.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13)
  }

  const safeName = data.messName.replace(/\s+/g, '_')
  doc.save(`NexMess_${safeName}_Financial_Record_${data.month}.pdf`)
}

export function computeSettlements(
  members: ReportMemberRow[],
  perPersonFixed: number
): ReportSettlement[] {
  const creditors: { name: string; amount: number }[] = []
  const debtors: { name: string; amount: number }[] = []
  members.forEach((m) => {
    const totalExp = m.mealCost + perPersonFixed
    const realBalance = m.deposited - totalExp
    const name = m.username || 'Member'
    if (realBalance > 0.5) creditors.push({ name, amount: realBalance })
    else if (realBalance < -0.5) debtors.push({ name, amount: -realBalance })
  })

  const transfers: ReportSettlement[] = []

  // 1. Debtors pay to Mess Treasury
  debtors.forEach((d) => {
    transfers.push({
      from: d.name,
      to: 'Mess Treasury',
      amount: Math.round(d.amount)
    })
  })

  // 2. Mess Treasury pays to Creditors
  creditors.forEach((c) => {
    transfers.push({
      from: 'Mess Treasury',
      to: c.name,
      amount: Math.round(c.amount)
    })
  })

  return transfers
}
