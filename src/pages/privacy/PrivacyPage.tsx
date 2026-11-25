import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSEO } from '../../hooks/useSEO'
import { formatNumber } from '../../lib/utils'
import { APP_VERSION } from '../../lib/version'
import PublicHeader from '../../components/layout/PublicHeader'

export default function PrivacyPage() {
  const { i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')

  useSEO({
    title: isBangla ? 'গোপনীয়তা নীতি (Privacy Policy) | নেক্সমেস' : 'Privacy Policy | NexMess',
    description: isBangla
      ? 'নেক্সমেস কীভাবে আপনার ব্যক্তিগত ও মেস তথ্য সংগ্রহ, প্রক্রিয়াকরণ ও সুরক্ষিত রাখে তা জানতে আমাদের গোপনীয়তা নীতি পড়ুন।'
      : 'Read the NexMess Privacy Policy to understand how we collect, process, secure, and protect your personal information in compliance with PDPA, GDPR, and CCPA.',
    canonical: 'https://www.nexmess.shop/privacy-policy',
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
              <Shield className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">
                {isBangla ? 'তথ্য সুরক্ষা সনদ' : 'Data Protection Charter'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {isBangla ? 'গোপনীয়তা নীতি (Privacy Policy)' : 'Privacy Policy'}
            </h1>
            <p className="text-nex-muted text-sm leading-relaxed">
              {isBangla
                ? `কার্যকর তারিখ: ২৫ নভেম্বর ২০২৬ (ভার্সন ${formatNumber(APP_VERSION)})। এই গোপনীয়তা নীতি নেক্সমেস ("আমরা" বা "আমাদের") কীভাবে আপনার ব্যক্তিগত ও মেস-সংক্রান্ত তথ্য সংগ্রহ, সংরক্ষণ এবং সুরক্ষিত করে তা নির্ধারণ করে। আমরা বাংলাদেশের ব্যক্তিগত তথ্য সুরক্ষা আইন (PDPA), GDPR এবং আন্তর্জাতিক তথ্য নিরাপত্তা মানদণ্ড মেনে আপনার তথ্যের গোপনীয়তা রক্ষায় প্রতিশ্রুতিবদ্ধ।`
                : `Effective Date: November 25, 2026 (v${APP_VERSION}). This Privacy Policy governs the data collection, processing, and storage practices of NexMess ("we," "us," or "our"). We are committed to protecting the privacy, security, and integrity of your personal information in accordance with the Bangladesh Personal Data Protection Act (PDPA), GDPR, and CCPA/CPRA.`}
            </p>
          </div>

          {/* Policy Sections */}
          <div className="text-nex-text space-y-8 text-sm leading-relaxed sm:text-base">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(1)}</span>
                {isBangla ? 'আমরা কী কী তথ্য সংগ্রহ ও প্রক্রিয়াকরণ করি' : 'Information We Collect & Process'}
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  {isBangla
                    ? 'একটি নিরাপদ ও স্বচ্ছ মেস ম্যানেজমেন্ট সেবা প্রদানের জন্য আমরা নিম্নলিখিত তথ্যগুলো সংগ্রহ করি:'
                    : 'To provide a collaborative and secure mess management experience, we collect and process the following categories of data:'}
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'অ্যাকাউন্ট ও পরিচয় তথ্য:' : 'Authentication & Identity Data:'}
                    </strong>{' '}
                    {isBangla
                      ? 'ইমেইল বা Google OAuth-এর মাধ্যমে নিবন্ধন করার সময় আমরা আপনার ইমেইল ঠিকানা, নাম এবং প্রোফাইল ছবি সংরক্ষণ করি।'
                      : 'When you register via email or authenticate through Google OAuth, we collect your primary email address, username/display name, and profile avatar URL.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'ভেরিফিকেশন ডকুমেন্ট:' : 'Verification & Compliance Documents:'}
                    </strong>{' '}
                    {isBangla
                      ? 'আপনি স্বেচ্ছায় মেস ম্যানেজারের কাছে পরিচয় যাচাইয়ের জন্য এনআইডি (NID) বা জন্ম নিবন্ধনের তথ্য জমা দিলে তা গোপন প্রাইভেট বাকেটে সংরক্ষিত হয়।'
                      : 'If you voluntarily submit verification details (e.g., National ID, Birth Certificate, or other ID) for your mess manager, we store the document type, number, and encrypted image copy in a private bucket.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'মেস পরিচালনার তথ্য:' : 'Mess Operational Data:'}
                    </strong>{' '}
                    {isBangla
                      ? 'দৈনিক মিল হিসাব, মেহমান মিল, বাজারের তালিকা ও শিডিউল, বাজার খরচ, জমা টাকা, ফিক্সড খরচ, নোটিশ বোর্ড এবং মেস গ্রুপ চ্যাটের বার্তা।'
                      : 'Daily meal logs, guest meal counts, bazaar schedules, shared expenses, deposit records, fixed utility costs, notice board posts, and group chat messages/media.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'পুশ নোটিফিকেশন সাবস্ক্রিপশন:' : 'Push Notification Subscriptions:'}
                    </strong>{' '}
                    {isBangla
                      ? 'তাৎক্ষণিক মিল ও বাজার অ্যালার্ট পাঠানোর জন্য ডিভাইসের ওয়েব-পুশ টোকেন এবং এনক্রিপশন কী সংরক্ষণ করা হয়।'
                      : 'Device push subscription endpoints and cryptographic keys are stored solely to deliver real-time meal cut-off, bazaar duty, and billing alerts.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'ত্রুটি পর্যবেক্ষণ ও কারিগরি লগ:' : 'Diagnostics & Usage Telemetry:'}
                    </strong>{' '}
                    {isBangla
                      ? 'অ্যাপের কোনো বাগ বা ক্র্যাশ দ্রুত শনাক্ত করতে আমরা ব্যক্তিগত তথ্যমুক্ত (PII-stripped) এরর লগ এবং ব্রাউজার নেভিগেশন মেট্রিক্স সংগ্রহ করি।'
                      : 'We collect anonymized navigation telemetry and PII-stripped client crash diagnostics to maintain reliability, diagnose bugs, and enforce rate limits.'}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(2)}</span>
                {isBangla ? 'তথ্য প্রক্রিয়াকরণের আইনি ভিত্তি' : 'Legal Bases for Processing'}
              </h2>
              <div className="text-nex-muted space-y-2 pl-8">
                <p>
                  {isBangla
                    ? 'আমরা নিম্নলিখিত বৈধ ভিত্তির ওপর নির্ভর করে আপনার তথ্য ব্যবহার করি:'
                    : 'We process your personal information under the following lawful bases:'}
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'সেবা প্রদান (চুক্তি বাস্তবায়ন):' : 'Performance of Contract:'}
                    </strong>{' '}
                    {isBangla
                      ? 'মিল রেট হিসাব, লেনদেন নিষ্পত্তি ও মাসিক রিপোর্ট পিডিএফ তৈরির মতো মূল ফিচার চালু রাখার জন্য।'
                      : 'Processing necessary to deliver meal rate calculations, settlement ledgers, and archived monthly PDF reports.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'স্পষ্ট সম্মতি:' : 'Explicit Consent:'}
                    </strong>{' '}
                    {isBangla
                      ? 'পুশ নোটিফিকেশন চালু করা বা পরিচয়পত্র আপলোডের ক্ষেত্রে আপনার স্পষ্ট অনুমতি নেওয়া হয়, যা আপনি যেকোনো সময় বন্ধ করতে পারেন।'
                      : 'You explicitly consent to optional features such as web push notifications or uploading verification IDs, and you can withdraw consent at any time.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'বৈধ নিরাপত্তা স্বার্থ:' : 'Legitimate Security Interests:'}
                    </strong>{' '}
                    {isBangla
                      ? 'অপব্যবহার রোধ, রেট লিমিটিং এবং Row-Level Security (RLS) সুরক্ষা নিশ্চিত করার জন্য।'
                      : 'Preventing spam/DDoS abuse, maintaining uptime, and enforcing strict Supabase Row-Level Security (RLS) access boundaries.'}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(3)}</span>
                {isBangla
                  ? 'তথ্য শেয়ারিং ও তৃতীয় পক্ষের অবকাঠামো'
                  : 'Data Sharing & Third-Party Service Providers'}
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  {isBangla
                    ? 'নেক্সমেস কখনোই আপনার ব্যক্তিগত তথ্য বিক্রি বা ভাড়া দেয় না। কেবল সেবা পরিচালনার স্বার্থে নিচের অনুমোদিত মাধ্যমগুলোতে তথ্য ব্যবহৃত হয়:'
                    : 'NexMess never sells, leases, or trades your personal data. Data is shared strictly as needed to operate the platform:'}
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'আপনার মেসের সদস্যবৃন্দ:' : 'Mess Co-members:'}
                    </strong>{' '}
                    {isBangla
                      ? 'একই অনুমোদিত মেস গ্রুপের সদস্যরা আপনার নাম, প্রোফাইল ছবি, জরুরি নম্বর, মিল সংখ্যা, জমা ও বাজারের হিসাব দেখতে পারবেন।'
                      : 'Approved roommates within your joined mess group can view your username, avatar, contact info, meal logs, deposits, expenses, and chat messages.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">Supabase (Database & Auth):</strong>{' '}
                    {isBangla
                      ? 'অথেনটিকেশন, PostgreSQL ডেটাবেজ এবং এনক্রিপ্টেড ফাইল স্টোরেজের জন্য ব্যবহৃত হয়; প্রতিটি টেবিল কঠোর RLS নীতিমালায় সুরক্ষিত।'
                      : 'Powers authentication, PostgreSQL storage, and file hosting behind strict Row-Level Security (RLS) isolation.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">Google Gemini API (NexMessAI):</strong>{' '}
                    {isBangla
                      ? 'নেক্সমেস এআই সহকারীর মাধ্যমে আপনার এলাকার বাজার দর ও মেন্যু পরামর্শ দিতে কেবল আপনার মেসের লোকেশন ও প্রশ্ন পাঠানো হয়।'
                      : 'Used to answer location-aware grocery price, shopping list, and meal planning queries in NexMessAI (read-only; cannot alter mess records).'}
                  </li>
                  <li>
                    <strong className="text-nex-text">Sentry & PostHog (Observability):</strong>{' '}
                    {isBangla
                      ? 'অ্যাপ ক্র্যাশ সমাধান ও ব্যবহারের মান উন্নয়নে ব্যবহৃত হয়; কোনো ব্যক্তিগত বা সংবেদনশীল তথ্য (PII) এসব সার্ভারে পাঠানো হয় না।'
                      : 'Used for crash reporting (with strict PII header/field stripping) and product performance telemetry.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">Cloudflare & Vercel & Resend:</strong>{' '}
                    {isBangla
                      ? 'দ্রুতগতির CDN, ডিডিওএস (DDoS) সুরক্ষা এবং সাপোর্ট ও পাসওয়ার্ড রিসেট ইমেইল প্রেরণের জন্য ব্যবহৃত হয়।'
                      : 'Provides global edge caching, SSL/DDoS mitigation, web hosting, and transactional/support email delivery.'}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(4)}</span>
                {isBangla ? 'তথ্য সংরক্ষণ ও অ্যাকাউন্ট মুছে ফেলা' : 'Data Retention & Member History'}
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  {isBangla
                    ? 'মেসের হিসাবের শতভাগ স্বচ্ছতা ও ঐতিহাসিক রেকর্ড অক্ষুণ্ণ রাখতে আমরা নিচের নিয়ম অনুসরণ করি:'
                    : 'We retain data strictly as needed to preserve accurate mess accounting:'}
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'মেস ত্যাগ করলে:' : 'Leaving or Removal from a Mess:'}
                    </strong>{' '}
                    {isBangla
                      ? 'কোনো সদস্য মেস ত্যাগ করলে বা ম্যানেজার তাকে সরিয়ে দিলে তিনি তাৎক্ষণিকভাবে মেসে অ্যাক্সেস হারান। তবে পূর্ববর্তী মাসগুলোর হিসাব, মিল এবং পিডিএফ রিপোর্ট নির্ভুল রাখতে তাঁর পুরোনো লেনদেন ও মিলের রেকর্ড সংরক্ষিত থাকে।'
                      : 'If a member leaves or is removed from a mess, they immediately lose workspace access. Their historical meal counts, deposits, and archived monthly PDF report entries are preserved so prior monthly audits remain 100% accurate for remaining members.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'অ্যাকাউন্ট ডিলিট করলে:' : 'Account Erasure:'}
                    </strong>{' '}
                    {isBangla
                      ? 'আপনি সেটিংস থেকে স্থায়ীভাবে অ্যাকাউন্ট ডিলিট করলে আপনার ব্যক্তিগত পরিচিতি (নাম, ইমেইল, ফোন নম্বর ও ডকুমেন্ট ফাইল) মুছে ফেলা হয় এবং ঐতিহাসিক হিসাব অজ্ঞাতনামা অবস্থায় সংরক্ষিত থাকে।'
                      : 'Deleting your account removes your personal identifiers (email, phone, avatar, verification documents) while preserving anonymized historical transaction totals where required for group ledger integrity.'}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(5)}</span>
                {isBangla ? 'তথ্য নিরাপত্তা প্রোটোকল' : 'Data Security Protocols'}
              </h2>
              <p className="text-nex-muted pl-8">
                {isBangla
                  ? 'সমস্ত ডেটাবেজ অ্যাক্সেস Row-Level Security (RLS) দ্বারা নিয়ন্ত্রিত যাতে কেবল অনুমোদিত মেস সদস্যরাই নিজেদের মেসের তথ্য দেখতে পারেন। ভেরিফিকেশন ডকুমেন্ট একটি প্রাইভেট স্টোরেজ বাকেটে রাখা হয় যা কেবল ১ ঘণ্টা মেয়াদি এনক্রিপ্টেড Signed URL-এর মাধ্যমে দেখা যায়। সমস্ত ট্রাফিক TLS/SSL এনক্রিপশনে সুরক্ষিত।'
                  : 'All database access is governed by Database Row-Level Security (RLS) policies, restricting read/write permissions to authorized mess members only. Sensitive verification document files are stored in a private bucket accessible only via time-limited signed URLs that expire after one hour. All data in transit is encrypted via TLS/SSL.'}
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(6)}</span>
                {isBangla
                  ? 'বাংলাদেশ ব্যক্তিগত তথ্য সুরক্ষা আইন (PDPA) ও আন্তর্জাতিক অধিকার'
                  : 'Bangladesh PDPA Compliance & User Rights'}
              </h2>
              <div className="text-nex-muted space-y-3 pl-8">
                <p>
                  {isBangla
                    ? 'বাংলাদেশের প্রচলিত তথ্য সুরক্ষা আইন (PDPA) এবং GDPR অনুযায়ী আপনার নিজের তথ্যের ওপর পূর্ণ অধিকার রয়েছে:'
                    : 'Under the Bangladesh Personal Data Protection Act (PDPA), GDPR, and CCPA, you retain full ownership and the following rights over your personal data:'}
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'তথ্য দেখা ও সংশোধনের অধিকার:' : 'Right of Access & Rectification:'}
                    </strong>{' '}
                    {isBangla
                      ? 'সেটিংস → প্রোফাইল থেকে যেকোনো সময় আপনার ব্যক্তিগত তথ্য পরিবর্তন বা আপডেট করতে পারবেন।'
                      : 'View, edit, or update your personal details anytime directly from Profile settings.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'মুছে ফেলার অধিকার:' : 'Right to Erasure:'}
                    </strong>{' '}
                    {isBangla
                      ? 'আপনার আপলোড করা ডকুমেন্ট বা সম্পূর্ণ অ্যাকাউন্ট মুছে ফেলার পূর্ণ অধিকার আপনার রয়েছে।'
                      : 'Request permanent deletion of your profile, credentials, and verification documents at any time.'}
                  </li>
                  <li>
                    <strong className="text-nex-text">
                      {isBangla ? 'শিশু সুরক্ষা ও ট্র্যাকিং নিষেধাজ্ঞা:' : 'Child Protection:'}
                    </strong>{' '}
                    {isBangla
                      ? 'আমরা শিশুদের লক্ষ্য করে কোনো আচরণগত ট্র্যাকিং বা বিজ্ঞাপন প্রদর্শন সম্পূর্ণরূপে নিষিদ্ধ করি।'
                      : 'We strictly prohibit profiling, behavioral tracking, or targeted advertising directed at children.'}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(7)}</span>
                {isBangla ? 'কুকিজ ও অফলাইন পিডব্লিউএ (PWA) স্টোরেজ' : 'Cookies, Local Storage & PWA Caching'}
              </h2>
              <p className="text-nex-muted pl-8">
                {isBangla
                  ? 'আপনার লগইন সেশন, নির্বাচিত ভাষা (বাংলা/English), থিম (লাইট/ডার্ক) এবং অফলাইন ফন্ট/অ্যাসেট সংরক্ষণের জন্য ব্রাউজারের Local Storage এবং Service Worker ব্যবহার করা হয়।'
                  : 'We use secure browser storage and Service Worker caching to persist your authentication session, language preference (English/Bengali), light/dark theme choice, and offline-ready assets. Google AdSense vendors may use cookies where ad placements are enabled, which you can manage in Google Ad Settings.'}
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-nex-text flex items-center gap-2.5 text-xl font-bold">
                <span className={badgeClass}>{formatNumber(8)}</span>
                {isBangla ? 'যোগাযোগ ও সহায়তা' : 'Contact & Administration'}
              </h2>
              <p className="text-nex-muted pl-8">
                {isBangla
                  ? 'এই গোপনীয়তা নীতি সম্পর্কিত কোনো প্রশ্ন বা তথ্য মুছে ফেলার অনুরোধের জন্য আমাদের সাপোর্ট টিমে ইমেইল করুন: '
                  : 'If you have questions regarding this Privacy Policy or wish to submit a data erasure request, please contact our support team at '}
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
            <Link to="/terms-of-service" className="hover:text-nex-text transition-colors">
              {isBangla ? 'শর্তাবলী' : 'Terms of Service'}
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
