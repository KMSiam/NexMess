import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSEO } from '../../hooks/useSEO'
import { formatNumber } from '../../lib/utils'
import PublicHeader from '../../components/layout/PublicHeader'

export default function TermsPage() {
  const { i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')

  useSEO({
    title: isBangla ? 'সেবার শর্তাবলী (Terms of Service) | নেক্সমেস' : 'Terms of Service | NexMess',
    description: isBangla
      ? 'নেক্সমেস স্মার্ট মেস ম্যানেজমেন্ট প্ল্যাটফর্ম ব্যবহারের শর্তাবলী, হিসাব-নিকাশের নীতিমালা ও ব্যবহারকারীর দায়িত্ব সম্পর্কে জানুন।'
      : 'Review the NexMess Terms of Service governing the use of our collaborative mess management platform, SaaS license, and cost split calculations.',
    canonical: 'https://www.nexmess.shop/terms-of-service',
    robots: 'index, follow',
  })

  const badgeClass =
    'bg-nex-primary/10 text-nex-primary dark:bg-emerald-500/15 dark:text-emerald-400 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold'

  return (
    <div
      className={`bg-nex-bg text-nex-text flex min-h-screen flex-col overflow-x-hidden select-none ${
        isBangla ? 'font-bangla' : 'font-sans'
      }`}
    >
      <PublicHeader />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 select-text sm:py-12">
        <div className="space-y-8">
          {/* Page Title & Intro */}
          <div className="border-nex-border/60 space-y-4 border-b pb-8 text-center sm:text-left">
            <div className="border-nex-primary/20 bg-nex-primary/10 text-nex-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">
                {isBangla ? 'ব্যবহারকারী চুক্তি' : 'User Agreement'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {isBangla ? 'সেবার শর্তাবলী (Terms of Service)' : 'Terms of Service'}
            </h1>
            <p className="text-nex-muted text-sm leading-relaxed">
              {isBangla
                ? 'কার্যকর তারিখ: ২৫ নভেম্বর ২০২৬ (ভার্সন ১.২৭.০)। এই শর্তাবলী আপনার এবং নেক্সমেস ("আমরা" বা "আমাদের")-এর মধ্যে একটি আইনগত চুক্তি। প্ল্যাটফর্মটি ব্যবহারের পূর্বে অনুগ্রহ করে শর্তাবলী মনোযোগ দিয়ে পড়ুন।'
                : 'Effective Date: November 25, 2026 (v1.27.0). These Terms of Service ("Terms") constitute a legally binding agreement between you ("User") and NexMess ("we," "us," or "our"). Please read these Terms carefully before accessing or using our platform.'}
            </p>
          </div>

          {/* Terms Sections */}
          <div className="text-nex-text space-y-8 text-sm leading-relaxed sm:text-base">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(1)}</span>
                {isBangla ? 'শর্তাবলী গ্রহণ ও যোগ্যতা' : 'Acceptance & Eligibility'}
              </h2>
              <p className="text-nex-muted pl-8">
                {isBangla ? (
                  <>
                    <a
                      href="https://nexmess.shop"
                      className="text-nex-primary font-medium hover:underline dark:text-emerald-400"
                    >
                      https://nexmess.shop
                    </a>{' '}
                    -এ অ্যাকাউন্ট তৈরি, Google OAuth দিয়ে লগইন অথবা আমাদের যেকোনো সেবা ব্যবহারের মাধ্যমে আপনি এই শর্তাবলীতে সম্মতি জানাচ্ছেন। শর্তাবলীতে অসম্মতি থাকলে প্ল্যাটফর্মটি ব্যবহার থেকে বিরত থাকুন।
                  </>
                ) : (
                  <>
                    By registering an account, authenticating via Google OAuth, or using our services
                    at{' '}
                    <a
                      href="https://nexmess.shop"
                      className="text-nex-primary font-medium hover:underline dark:text-emerald-400"
                    >
                      https://nexmess.shop
                    </a>
                    , you confirm that you have read, understood, and agree to be bound by these Terms.
                    You must be of legal age under your jurisdiction to enter into a binding agreement.
                  </>
                )}
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(2)}</span>
                {isBangla ? 'সেবার পরিধি ও লাইসেন্স' : 'Scope of Service & SaaS License'}
              </h2>
              <p className="text-nex-muted pl-8">
                {isBangla
                  ? 'নেক্সমেস আপনাকে মেসের দৈনিক মিল ট্র্যাকিং, বাজার ও ফিক্সড খরচ বণ্টন, বাজারের রুটিন পরিচালনা, মাসিক পিডিএফ রিপোর্ট তৈরি এবং গ্রুপ চ্যাট ব্যবহারের জন্য একটি সীমিত ও অ-হস্তান্তরযোগ্য ব্যক্তিগত লাইসেন্স প্রদান করে। সেবার মান উন্নয়নে আমরা যেকোনো ফিচার পরিবর্তন বা হালনাগাদ করার অধিকার সংরক্ষণ করি।'
                  : 'NexMess grants you a limited, non-exclusive, revocable, non-transferable license to access and use our platform for roommate kitchen coordination, meal tracking, expense logging, monthly archiving, and group communication. We reserve the right to refine, update, or modify platform features as needed.'}
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(3)}</span>
                {isBangla ? 'অ্যাকাউন্ট নিরাপত্তা ও নিবন্ধন' : 'Account Security & Registration'}
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>
                  {isBangla
                    ? 'অ্যাকাউন্ট সুরক্ষিত রাখতে আপনি নিম্নলিখিত বিষয়ে সম্মত হচ্ছেন:'
                    : 'To maintain account integrity, you agree to:'}
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    {isBangla
                      ? 'প্রোফাইলে সঠিক ও নির্ভুল তথ্য প্রদান করা।'
                      : 'Provide accurate, current, and complete profile information.'}
                  </li>
                  <li>
                    {isBangla
                      ? 'আপনার পাসওয়ার্ড, সেশন কী ও Google লগইন তথ্য গোপন রাখা।'
                      : 'Maintain the confidentiality of your password, session tokens, and Google OAuth credentials.'}
                  </li>
                  <li>
                    {isBangla
                      ? 'আপনার অ্যাকাউন্ট থেকে করা সকল মিল এন্ট্রি, খরচ ও কার্যকলাপের দায়ভার গ্রহণ করা।'
                      : 'Accept responsibility for all meal toggles, financial records, and messages logged under your account.'}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(4)}</span>
                {isBangla
                  ? 'ব্যবহারকারীর আচরণবিধি ও তথ্যের সত্যতা'
                  : 'User Code of Conduct & Data Integrity'}
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  {isBangla
                    ? 'মেসের সকলের সাথে সততা ও সহযোগিতার সাথে নেক্সমেস ব্যবহার করুন। নিচের কাজগুলো সম্পূর্ণ নিষিদ্ধ:'
                    : 'You agree to use NexMess honestly and cooperatively. You are strictly prohibited from:'}
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    {isBangla
                      ? 'রুমমেটদের ব্যালেন্স বিকৃত করার উদ্দেশ্যে ভুয়া মিল সংখ্যা, বাজার খরচ বা জমার হিসাব যুক্ত করা।'
                      : 'Falsifying meal records, bazaar expenses, deposits, or fixed costs to manipulate roommate balances.'}
                  </li>
                  <li>
                    {isBangla
                      ? 'মেস চ্যাটে কোনো অবমাননাকর, হয়রানিমূলক বা বেআইনি কনটেন্ট শেয়ার করা।'
                      : 'Posting abusive, harassing, defamatory, or unlawful content inside Group Chat.'}
                  </li>
                  <li>
                    {isBangla
                      ? 'সিস্টেমের নিরাপত্তা স্তর (যেমন Supabase RLS বা Edge Function রেট-লিমিট) ভঙ্গ করা বা অননুমোদিত স্ক্রিপ্ট চালানোর চেষ্টা করা।'
                      : 'Attempting to bypass Row-Level Security (RLS), rate limiters, or executing automated scraping/abuse against our infrastructure.'}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(5)}</span>
                {isBangla
                  ? 'আর্থিক হিসাব, এআই সহকারী ও লেনদেন সংক্রান্ত ডিসক্লেইমার'
                  : 'Financial Calculations, AI Assistant & Settlement Disclaimers'}
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  <strong className="text-nex-text">
                    {isBangla ? 'হিসাব-নিকাশের সহায়ক টুল:' : 'Calculation Utility Only:'}
                  </strong>{' '}
                  {isBangla
                    ? 'নেক্সমেস কেবল মেসের খরচ, মিল রেট এবং কে কার কাছে কত টাকা পাবে তা হিসাব করে দেয়। আমরা কোনো পেমেন্ট গেটওয়ে, ব্যাংক বা মোবাইল ব্যাংকিং এজেন্ট নই।'
                    : 'NexMess is an accounting and coordination utility. We are NOT a bank, payment gateway, or money transmitter.'}
                </p>
                <p>
                  <strong className="text-nex-text">
                    {isBangla ? 'বাস্তব লেনদেন:' : 'No Settlement Liability:'}
                  </strong>{' '}
                  {isBangla
                    ? 'নগদ বা বিকাশ/নগদে সকল টাকা লেনদেন সদস্যদের নিজেদের মধ্যে সম্পন্ন করতে হবে। ব্যবহারকারীর ভুল ইনপুট বা ব্যক্তিগত আর্থিক বিরোধের জন্য নেক্সমেস দায়ী থাকবে না।'
                    : 'Actual cash, bank, or MFS transfers happen directly between mess members outside the platform. We disclaim liability for payment disputes or user data-entry errors.'}
                </p>
                <p>
                  <strong className="text-nex-text">
                    {isBangla ? 'নেক্সমেস এআই (NexMessAI):' : 'AI Market Assistant:'}
                  </strong>{' '}
                  {isBangla
                    ? 'এআই সহকারীর বাজার দর ও রান্নার পরামর্শ শুধুমাত্র তথ্যগত সহায়তার জন্য; বাস্তব বাজারমূল্য স্থানভেদে ভিন্ন হতে পারে।'
                    : 'Market price estimates and shopping lists provided by NexMessAI are informational guides and may vary by local market conditions.'}
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(6)}</span>
                {isBangla ? 'দায়বদ্ধতার সীমাবদ্ধতা' : 'Disclaimers & Limitation of Liability'}
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  {isBangla
                    ? 'সেবাটি "যেমন আছে" (AS IS) ভিত্তিতে প্রদান করা হয়। অনিবার্য সার্ভার রক্ষণাবেক্ষণ বা প্রযুক্তিগত ত্রুটির কারণে সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত, তবে সর্বোচ্চ স্থিতিশীলতা বজায় রাখতে সর্বদা সচেষ্ট।'
                    : 'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.'}
                </p>
                <p className="text-xs font-semibold tracking-wider text-rose-600 uppercase dark:text-rose-400">
                  {isBangla
                    ? 'কোনো পরোক্ষ ক্ষতি, ডেটা হ্রাস বা সদস্যদের মধ্যকার আর্থিক বিরোধের জন্য নেক্সমেস বা এর ডেভেলপারগণ দায়ী থাকবেন না। মোট সর্বোচ্চ দায়বদ্ধতা ৫০০ টাকা (বা ৫ মার্কিন ডলার) পর্যন্ত সীমাবদ্ধ।'
                    : 'IN NO EVENT SHALL NEXMESS OR ITS CONTRIBUTORS BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. TOTAL CUMULATIVE LIABILITY IS LIMITED TO 500 BDT (OR $5 USD).'}
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(7)}</span>
                {isBangla ? 'প্রযোজ্য আইন ও এখতিয়ার' : 'Governing Law & Jurisdiction'}
              </h2>
              <p className="text-nex-muted pl-8">
                {isBangla
                  ? 'এই শর্তাবলী বাংলাদেশের প্রচলিত আইন অনুযায়ী পরিচালিত হবে এবং যেকোনো আইনি বিষয় ঢাকা, বাংলাদেশের উপযুক্ত আদালতে নিষ্পত্তি হবে।'
                  : 'These Terms of Service are governed by the laws of Bangladesh. Any disputes arising from these Terms shall be resolved in the competent courts of Dhaka, Bangladesh.'}
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(8)}</span>
                {isBangla ? 'যোগাযোগের ঠিকানা' : 'Contact Information'}
              </h2>
              <p className="text-nex-muted pl-8">
                {isBangla
                  ? 'শর্তাবলী সম্পর্কে যেকোনো প্রশ্ন বা মতামতের জন্য ইমেইল করুন: '
                  : 'If you have questions regarding these Terms of Service, please contact us at '}
                <a
                  href="mailto:support@nexmess.shop"
                  className="text-nex-primary font-medium hover:underline dark:text-emerald-400"
                >
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
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <span>
            {isBangla
              ? `© ${formatNumber(new Date().getFullYear())} নেক্সমেস। সর্বস্বত্ব সংরক্ষিত।`
              : `© ${new Date().getFullYear()} NexMess. All rights reserved.`}
          </span>
          <span className="text-nex-border/50 hidden sm:inline">|</span>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-nex-text transition-colors">
              {isBangla ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </Link>
            <Link to="/faq" className="hover:text-nex-text transition-colors">
              {isBangla ? 'সাধারণ প্রশ্ন (FAQ)' : 'FAQ'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
