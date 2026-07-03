import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import logoIcon from '../../assets/logo-icon.svg'

export default function TermsPage() {
  usePageTitle('Terms of Service')

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
              Last updated:{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              . Please read these Terms of Service carefully before accessing or using NexMess.
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
                Acceptance of Terms
              </h2>
              <p className="text-nex-muted pl-8">
                By creating an account, linking your Google account, or using NexMess (accessible at{' '}
                <a href="https://nex-mess.vercel.app" className="text-blue-500 hover:underline">
                  https://nex-mess.vercel.app
                </a>
                ), you agree to be bound by these Terms of Service. If you do not agree to all these
                terms, you are prohibited from using the platform.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  2
                </span>
                Description of Service
              </h2>
              <p className="text-nex-muted pl-8">
                NexMess is a web application designed to facilitate collective kitchen and roommate
                coordination. The services include logging daily meals, recording deposits and
                bazaar spending, rotating duty shifts, hosting messaging workspaces, and performing
                financial calculations (such as calculating individual balances and meal rates).
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  3
                </span>
                Accounts & Registration
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>
                  To use the features, you must log in securely via Google OAuth or create an
                  email/password account.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>You must provide accurate and complete registration information.</li>
                  <li>
                    You are responsible for keeping your credentials and OAuth sessions secure.
                  </li>
                  <li>
                    You must notify us immediately of any unauthorized use or safety breaches.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  4
                </span>
                Rules of Conduct & User Content
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>As a user, you agree not to use the service to:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Log fraudulent meal schedules or bazaar records to artificially alter roommate
                    accounts.
                  </li>
                  <li>
                    Upload, post, or transmit abusive, harassing, or unlawful material within the
                    Group Chat.
                  </li>
                  <li>
                    Interfere with or bypass security protocols (such as Supabase RLS policies).
                  </li>
                  <li>Spam other roommates or overload our server infrastructure.</li>
                </ul>
                <p>
                  We do not claim ownership of user-uploaded text or files. However, by posting
                  content inside a shared mess, you grant NexMess the necessary runtime rights to
                  host, store, and display that content for other members of that mess.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  5
                </span>
                Disclaimers & Liability Limits
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  <strong className="text-nex-text">Disclaimer of Warranties:</strong> NexMess is
                  provided on an "as is" and "as available" basis. We make no guarantees that the
                  application will be uninterrupted, error-free, or that calculations are completely
                  free of bugs.
                </p>
                <p>
                  <strong className="text-nex-text">Limitation of Liability:</strong> NexMess, its
                  developers, and contributors shall not be liable for any direct or indirect
                  damages, data loss, or financial disputes arising between roommates or members of
                  any mess. The coordination of payments and cash settlements remains solely the
                  responsibility of the mess members.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  6
                </span>
                Termination
              </h2>
              <p className="text-nex-muted pl-8">
                We reserve the right to restrict access, suspend accounts, or terminate service to
                any user or mess group found violating these terms or engaging in disruptive
                behavior that degrades platform operation.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-600">
                  7
                </span>
                Modifications to Terms
              </h2>
              <p className="text-nex-muted pl-8">
                We reserve the right to revise these Terms of Service at any time. When updates are
                published, the date at the top will be updated. Your continued use of the platform
                constitutes agreement to the updated Terms.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-nex-muted border-nex-border/50 mt-auto border-t px-6 py-8 text-center text-xs">
        <div>&copy; {new Date().getFullYear()} NexMess Inc. All rights reserved.</div>
      </footer>
    </div>
  )
}
