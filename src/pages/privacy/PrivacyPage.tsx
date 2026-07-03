import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'
import logoIcon from '../../assets/logo-icon.svg'

export default function PrivacyPage() {
  usePageTitle('Privacy Policy')

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
              <span className="text-xs font-bold tracking-wider uppercase">Privacy Center</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy Policy</h1>
            <p className="text-nex-muted text-sm leading-relaxed">
              Last updated:{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              . Please read this privacy policy carefully to understand our policies and practices
              regarding your information and how we treat it.
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
                Introduction & Scope
              </h2>
              <p className="text-nex-muted pl-8">
                Welcome to NexMess (accessible at{' '}
                <a href="https://nex-mess.vercel.app" className="text-blue-500 hover:underline">
                  https://nex-mess.vercel.app
                </a>
                ). We respect your privacy and are committed to protecting the personal data you
                share with us. This policy describes how we collect, store, use, and protect your
                information when you use our mess management features, log in via Google OAuth, or
                browse our site.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  2
                </span>
                Information We Collect
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  To provide our services, we collect information that falls into two main
                  categories:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">Account & Authentication Data:</strong> When
                    you register or log in using Google OAuth, we receive your email address, full
                    name, and profile picture URL. This is required to identify you in the system
                    and link your account to your mess.
                  </li>
                  <li>
                    <strong className="text-nex-text">Mess & Group Activity Data:</strong> Any
                    information you enter while participating in a mess, including meal records,
                    daily bazaar logs, deposit records, shared expenses, routine schedules, and
                    messages sent in the Group Chat.
                  </li>
                  <li>
                    <strong className="text-nex-text">Usage & Device Information:</strong> Standard
                    server logs, IP addresses, browser agent descriptions, and basic analytics data
                    to optimize site performance.
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
                How We Use Your Information
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>We use the collected information for the following purposes:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>To establish your profile and securely authenticate your identity.</li>
                  <li>
                    To coordinate daily meal configurations, calculate financial statistics (such as
                    individual meal rates and bazaar deposits), and rotate routine duties fairly.
                  </li>
                  <li>To deliver real-time notifications and host group chat messages.</li>
                  <li>To display relevant ads via Google AdSense (if enabled on the site).</li>
                  <li>To maintain platform security, prevent fraud, and fix runtime exceptions.</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  4
                </span>
                Data Storage & Sharing
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  Your privacy is paramount. We do not sell or lease your personal information to
                  third parties. We share your data only in the following contexts:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">With Mess Members:</strong> Because NexMess is
                    a collaborative application, your roommates inside your joined mess will see
                    your name, profile picture, meals logged, expenses entered, and messages in the
                    chat.
                  </li>
                  <li>
                    <strong className="text-nex-text">Service Providers:</strong> We use Supabase
                    for authentication, backend database systems, and media storage. Your
                    authentication records are stored securely in Supabase with standard Row-Level
                    Security (RLS) configurations.
                  </li>
                  <li>
                    <strong className="text-nex-text">Legal Compliance:</strong> If required by law,
                    we may disclose your information to comply with valid legal processes.
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
                Cookies & Advertising
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>
                  We use essential local storage tokens and session cookies to keep you signed in.
                </p>
                <p>
                  Additionally, third-party vendors, including Google, may use cookies to serve ads
                  based on your prior visits to this website or other websites. Google's use of
                  advertising cookies enables it and its partners to serve ads to you based on your
                  visit to this site and/or other sites on the Internet. You may opt out of
                  personalized advertising by visiting Ads Settings in your Google Account.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  6
                </span>
                Security of Your Data
              </h2>
              <p className="text-nex-muted pl-8">
                We implement robust security measures including cryptographic password hashing, SSL
                encryption for all network traffic, and Database Row-Level Security (RLS) rules to
                guarantee that unauthorized users cannot inspect, modify, or delete your group data.
                Please remember that no transmission method over the Internet is 100% secure.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2 text-xl font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-bold text-blue-600">
                  7
                </span>
                Your Rights & Deletion
              </h2>
              <p className="text-nex-muted pl-8">
                Depending on your location, you have rights to access, edit, or permanently erase
                your personal data. If you wish to delete your account or have your associated
                information removed from our database, you can initiate this request by reaching out
                to our support channel directly from the floating contact button on the Home page.
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
