import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { useSEO } from '../../hooks/useSEO'
import logoIcon from '../../assets/logo-icon.svg'

export default function PrivacyPage() {
  useSEO({
    title: 'Privacy Policy',
    description: 'Read the NexMess Privacy Policy to understand how we collect, process, secure, and protect your personal information in compliance with GDPR and CCPA.',
    canonical: 'https://www.nexmess.shop/privacy-policy',
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
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-600 dark:text-blue-400">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">Data Protection Charter</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy Policy</h1>
            <p className="text-nex-muted text-sm leading-relaxed">
              Effective Date: July 9, 2026. This Privacy Policy governs the data collection, processing, and storage practices of NexMess ("we," "us," or "our"). We are committed to protecting the privacy, security, and integrity of your personal information in accordance with global data protection frameworks including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA/CPRA).
            </p>
          </div>

          {/* Policy Sections */}
          <div className="text-nex-text space-y-8 text-sm leading-relaxed sm:text-base">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  1
                </span>
                Information We Collect & Process
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  To provide a collaborative and secure mess management experience, we collect and process the following categories of data:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">Authentication and Identity Data:</strong> If you register via email or authenticate through Google OAuth, we collect your primary email address, authenticated full name, and profile picture URL.
                  </li>
                  <li>
                    <strong className="text-nex-text">Verification and Compliance Documents:</strong> If you submit verification details to verify your account (e.g., National ID, Birth Certificate, or other government-issued documents), we store the document type, document identification number, and the uploaded image file.
                  </li>
                  <li>
                    <strong className="text-nex-text">Mess Operational Data:</strong> This includes meal logs, bazaar schedules, daily bazaar expenses, deposit records, fixed costs, notice board announcements, and user-generated text/media chat messages.
                  </li>
                  <li>
                    <strong className="text-nex-text">Push Notification Subscriptions:</strong> We store device push subscription metadata (including browser endpoints, authorization keys, and public keys) to deliver real-time system alerts.
                  </li>
                  <li>
                    <strong className="text-nex-text">Technical Logs & Usage Analytics:</strong> We collect client-side crash logs, device IP addresses, browser user-agent strings, and navigation telemetry to monitor stability and prevent system abuse.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  2
                </span>
                Legal Bases for Processing (GDPR)
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>We process your personal information under the following lawful bases:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">Performance of Contract:</strong> Processing is necessary to deliver the features defined in our Terms of Service, including meal rate tracking, roommate financial settlement sheets, and group workspaces.
                  </li>
                  <li>
                    <strong className="text-nex-text">Consent:</strong> You explicitly consent to certain processing activities, such as receiving push notifications or submitting verification documents to mess managers. You have the right to withdraw consent at any time.
                  </li>
                  <li>
                    <strong className="text-nex-text">Legitimate Interests:</strong> To optimize platform performance, monitor service stability, and enforce security policies (like RLS validations).
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  3
                </span>
                Data Sharing & Third-Party Service Providers
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  NexMess does not sell, lease, or trade your personal data. We disclose your data only to the following entities:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">Mess Co-members:</strong> Roommates who belong to the same mess group can view your profile details (username, avatar, contact number), meal logs, shared expenses, deposits, and chat logs.
                  </li>
                  <li>
                    <strong className="text-nex-text">Database & Backend Hosting (Supabase):</strong> We use Supabase, Inc. to secure authentication, execute database operations, and host media files (like avatars and verification copies). All Supabase storage and databases are secured behind rigorous Row-Level Security (RLS) rules.
                  </li>
                  <li>
                    <strong className="text-nex-text">Email Infrastructure (Resend):</strong> Feedback forms and critical system messages are sent via Resend, Inc.
                  </li>
                  <li>
                    <strong className="text-nex-text">Legal Compulsion:</strong> We may disclose information if required by a valid legal subpoena, court order, or applicable national laws.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  4
                </span>
                Data Retention & Account Erasure
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  We retain personal data only for as long as necessary to fulfill the mess management objectives:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">Active Accounts:</strong> User profiles, operational logs, and messages are stored as long as your account remains active or until your mess group is deleted.
                  </li>
                  <li>
                    <strong className="text-nex-text">Account Deletion:</strong> If you delete your account or leave a mess, your sensitive identity data (username, email, contact number, and verification files) is scrubbed. Transaction summaries (like historical meals or deposit amounts) are retained in an anonymous format to prevent breaking other members' past financial metrics.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  5
                </span>
                Data Security Protocols
              </h2>
              <p className="text-nex-muted pl-8">
                We implement strict technical and organizational measures to safeguard your data. All database access is governed by Database Row-Level Security (RLS) policies, restricting read/write permissions to authorized mess members only. Sensitive verification document files are stored in a private bucket, and access is restricted using cryptographic, time-limited signed URLs that expire automatically after one hour. All data in transit is protected using industry-standard TLS/SSL encryption.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  6
                </span>
                Bangladesh Personal Data Protection Act (PDPA) Compliance
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  As we operate under the jurisdiction of Bangladesh, we fully comply with the Bangladesh Personal Data Protection Act (PDPA). The legal framework recognizes your personal data as your property, and we treat it as such:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">Citizen Data Ownership & Rights:</strong> You have full ownership of your data and possess the right to access, correct, delete, and withdraw consent. You can manage or delete your profile directly in settings or by reaching out to support.
                  </li>
                  <li>
                    <strong className="text-nex-text">Explicit Consent:</strong> In accordance with PDPA requirements, we obtain your voluntary, specific, and clear consent prior to collecting or processing any personal information.
                  </li>
                  <li>
                    <strong className="text-nex-text">Cross-Border Data Residency:</strong> Under PDPA regulations, classified and restricted citizen personal data must be stored locally within Bangladesh or mirrored securely. We partner with secure hosting providers (Supabase) and coordinate with the National Data Governance Authority (NDGA) to enforce local data mirroring compliance for restricted data.
                  </li>
                  <li>
                    <strong className="text-nex-text">Child Protection & Behavioral Tracking:</strong> We strictly prohibit profiling, behavioral tracking, or targeted advertising directed at children on our platform.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  7
                </span>
                Your Rights & Data Choices (GDPR, CCPA & Global Frameworks)
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>Depending on your jurisdiction (such as GDPR, CCPA, or PDPA), you possess the following rights:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li><strong className="text-nex-text">Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
                  <li><strong className="text-nex-text">Right to Rectification:</strong> Edit or correct inaccurate or incomplete details from your Profile settings.</li>
                  <li><strong className="text-nex-text">Right to Erasure (To Be Forgotten):</strong> Request the permanent deletion of your profile and verification records.</li>
                  <li><strong className="text-nex-text">Right to Object/Opt-out:</strong> Manage cookies and personalized ads, or opt-out of notifications at any time.</li>
                </ul>
              </div>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  8
                </span>
                Cookies & Third-Party Advertising
              </h2>
              <p className="text-nex-muted pl-8">
                We use secure local storage tokens to keep you authenticated across browser sessions. If we enable Google AdSense, third-party vendors (including Google) may use cookies to serve ads based on your visits to our site or other websites. You can manage or disable personalized advertising by visiting Google's Ad Settings.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  9
                </span>
                Contact & Administration
              </h2>
              <p className="text-nex-muted pl-8">
                If you have questions regarding this Privacy Policy, or wish to submit a data erasure request under the Bangladesh NDGA or other regulatory bodies, please contact our support team at{' '}
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
