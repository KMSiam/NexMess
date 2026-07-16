import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { useSEO } from '../../hooks/useSEO'
import logoIcon from '../../assets/logo-icon.svg'

export default function TermsPage() {
  useSEO({
    title: 'Terms of Service',
    description: 'Review the NexMess Terms of Service governing the use of our collaborative mess management platform, SaaS license, and cost split calculations.',
    canonical: 'https://www.nexmess.shop/terms-of-service',
    robots: 'index, follow',
  })

  return (
    <div className="bg-nex-bg text-nex-text flex min-h-screen flex-col overflow-x-hidden font-sans select-none">
      {/* Header */}
      <header className="nex-glass border-nex-border/50 sticky top-0 z-40 flex w-full items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="NexMess" className="h-8 w-8 rounded-lg" />
          <span className="text-nex-text text-lg font-bold tracking-tight">NexMess</span>
        </div>
        <Link
          to="/"
          className="nex-btn-secondary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 select-text">
        <div className="space-y-8">
          {/* Page Title & Intro */}
          <div className="border-nex-border/50 space-y-4 border-b pb-8 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-indigo-600 dark:text-indigo-400">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">User Agreement</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Terms of Service</h1>
            <p className="text-nex-muted text-sm leading-relaxed">
              Effective Date: July 9, 2026. These Terms of Service ("Terms") constitute a legally binding agreement between you ("User") and NexMess ("we," "us," or "our"). Please read these Terms carefully before accessing or using our platform.
            </p>
          </div>

          {/* Terms Sections */}
          <div className="text-nex-text space-y-8 text-sm leading-relaxed sm:text-base">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  1
                </span>
                Acceptance & Eligibility
              </h2>
              <p className="text-nex-muted pl-8">
                By registering an account, authenticating via Google OAuth, or using our services at{' '}
                <a href="https://nexmess.shop" className="text-blue-500 hover:underline">
                  https://nexmess.shop
                </a>
                , you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you are strictly prohibited from using the platform. You must be of legal age under your jurisdiction to enter into a binding contract to register or use this service.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  2
                </span>
                Scope of Service & SaaS License
              </h2>
              <p className="text-nex-muted pl-8">
                NexMess grants you a limited, non-exclusive, revocable, non-transferable, and personal license to access and use our web application for roommate kitchen coordination, meal tracking, expense logging, routine scheduling, and group communication. We reserve the right to modify, suspend, or discontinue any feature or aspect of the platform at any time without prior notice.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  3
                </span>
                Account Security & Registration
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>
                  To access platform features, you must authenticate securely. You agree to:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Provide accurate, current, and complete profile information.</li>
                  <li>Maintain the confidentiality of your session keys and Google OAuth login details.</li>
                  <li>Accept full responsibility for all activities, entries, and financial logs recorded under your account credentials.</li>
                  <li>Proactively notify us of any security breaches or unauthorized account accesses.</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  4
                </span>
                User Code of Conduct & Data Integrity
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>You agree to use NexMess in a cooperative, honest manner. You are strictly prohibited from:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Falsifying meal records, bazaar schedules, deposit statements, or fixed costs to artificially alter roommate balances.
                  </li>
                  <li>
                    Uploading, posting, or transmitting abusive, harassing, defamatory, or unlawful materials within the Group Chat.
                  </li>
                  <li>
                    Attempting to reverse-engineer, inject scripts, execute unauthorized RPC queries, or bypass security rules (such as Supabase Row-Level Security).
                  </li>
                  <li>
                    Automating database writes, scraping site data, or overloading our hosting infrastructure.
                  </li>
                </ul>
                <p>
                  In compliance with the Bangladesh Personal Data Protection Act (PDPA), we recognize and declare that you retain full ownership and proprietary rights over your personal data. We do not claim ownership of user-submitted data. However, you grant NexMess a voluntary, specific, and clear license to host, store, process, and display your data (e.g. expenses, meals, notices, chat messages) solely to provide the services described herein to the co-members of your joined mess group. You may withdraw this consent or request deletion of your data at any time, subject to PDPA guidelines and standard data erasure procedures.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  5
                </span>
                Financial Calculations & Settlement Disclaimers
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  <strong className="text-nex-text">Calculation Utility Only:</strong> NexMess is an accounting and coordination utility designed to help roommates compute shared costs. We are NOT a payment gateway, banking entity, or money transfer agent.
                </p>
                <p>
                  <strong className="text-nex-text">No Settlement Liability:</strong> NexMess does not process, manage, or hold any actual cash or digital payments. All roommate debts, bazaar cash handoffs, and settlement transfers must be made manually outside the platform (via cash, bank transfer, or mobile financial services). We disclaim all liability for roommate payment disputes, incorrect math due to user-input errors, or uncoordinated cash losses.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  6
                </span>
                Disclaimers & Limitation of Liability
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  <strong className="text-nex-text">Disclaimer of Warranties:</strong> THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE ACCURACY OF CALCULATIONS, SERVICE UPTIME, DATABASE RETRIEVAL STABILITY, OR FREEDOM FROM PROGRAMMING ERRORS.
                </p>
                <p className="uppercase font-semibold text-xs tracking-wider text-red-600 dark:text-red-400">
                  IN NO EVENT SHALL NEXMESS, ITS DEVELOPERS, CONTRIBUTING MEMBERS, OR PROVIDERS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, SYSTEM DOWNTIME, ROOMMATE FINANCIAL DISPUTES, OR SECURITY BREACHES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL CUMULATIVE LIABILITY SHALL BE LIMITED TO THE AMOUNT OF 500 BDT (OR $5 USD).
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  7
                </span>
                Governing Law & Jurisdiction
              </h2>
              <p className="text-nex-muted pl-8">
                These Terms of Service are governed by and construed in accordance with the laws of Bangladesh, without regard to its conflict of law principles. Any legal disputes or claims arising out of or related to these terms or platform usage must be resolved exclusively in the competent courts located in Dhaka, Bangladesh.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  8
                </span>
                Contact Information
              </h2>
              <p className="text-nex-muted pl-8">
                If you have questions, concerns, or legal inquiries regarding these Terms of Service, please contact our administration at{' '}
                <a href="mailto:support@nexmess.shop" className="text-blue-500 hover:underline">
                  support@nexmess.shop
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-nex-muted border-nex-border/50 mt-auto border-t px-6 py-8 text-center text-xs">
        <div>&copy; {new Date().getFullYear()} NexMess. All rights reserved.</div>
      </footer>
    </div>
  )
}
