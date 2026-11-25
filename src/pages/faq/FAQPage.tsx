import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSEO } from '../../hooks/useSEO'
import { formatNumber } from '../../lib/utils'
import PublicHeader from '../../components/layout/PublicHeader'

interface FAQItem {
  question: string
  answerText: string
  answer: React.ReactNode
}

export default function FAQPage() {
  const { i18n } = useTranslation()
  const isBangla = (i18n.language || 'en').startsWith('bn')

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqItems: FAQItem[] = isBangla
    ? [
        {
          question: 'নেক্সমেস (NexMess) কী এবং ব্যাচেলর বা ছাত্র মেসে এটি কীভাবে সাহায্য করে?',
          answerText:
            'নেক্সমেস হলো ব্যাচেলর মেস, স্টুডেন্ট হোস্টেল এবং শেয়ার্ড অ্যাপার্টমেন্টের জন্য তৈরি আধুনিক ক্লাউড-ভিত্তিক মেস ম্যানেজমেন্ট প্ল্যাটফর্ম। এটি রিয়েল-টাইমে দৈনিক মিল গণনা, স্বয়ংক্রিয় মিল রেট, বাজার শিডিউল, লেনদেন নিষ্পত্তি এবং গ্রুপ চ্যাটের সম্পূর্ণ সমাধান দেয়।',
          answer: (
            <p>
              <strong>নেক্সমেস</strong> হলো ব্যাচেলর মেস, স্টুডেন্ট হোস্টেল এবং শেয়ার্ড অ্যাপার্টমেন্টের
              জন্য তৈরি আধুনিক ক্লাউড-ভিত্তিক মেস ম্যানেজমেন্ট প্ল্যাটফর্ম। কাগজের খাতা বা এক্সেল শিটের
              ঝামেলা ও ভুল হিসাব দূর করে এটি রিয়েল-টাইমে দৈনিক মিল গণনা, স্বয়ংক্রিয় মিল রেট, বাজার
              শিডিউল, লেনদেন নিষ্পত্তি এবং গ্রুপ চ্যাটের সম্পূর্ণ সমাধান দেয়।
            </p>
          ),
        },
        {
          question: 'দৈনিক মিল চালু-বন্ধ এবং কাট-অফ টাইম (Cut-off Lock) কীভাবে কাজ করে?',
          answerText:
            'সদস্যরা ড্যাশবোর্ড বা মিল ক্যালেন্ডার থেকে আজকের বা আগামীকালের দুপুর ও রাতের মিল চালু/বন্ধ ও মেহমান সংখ্যা যোগ করতে পারেন। বাংলাদেশ সময় (UTC+6) অনুযায়ী দুপুরের মিল সকাল ১০:০০ টায় এবং রাতের মিল বিকাল ৪:০০ টায় স্বয়ংক্রিয়ভাবে লক হয়ে যায়।',
          answer: (
            <p>
              সদস্যরা ড্যাশবোর্ড বা মিল ক্যালেন্ডার থেকে আজকের বা আগামীকালের <strong>দুপুর</strong> ও{' '}
              <strong>রাতের</strong> মিল সহজেই চালু/বন্ধ করতে পারেন এবং মেহমান (Guest) সংখ্যা যোগ
              করতে পারেন। বাজার অপচয় রোধে বাংলাদেশ সময় (UTC+6) অনুযায়ী{' '}
              <strong>দুপুরের মিল সকাল ১০:০০ টায়</strong> এবং <strong>রাতের মিল বিকাল ৪:০০ টায়</strong>{' '}
              স্বয়ংক্রিয়ভাবে লক হয়ে যায়। তবে জরুরি প্রয়োজনে ম্যানেজার <em>Manager Override</em> দিয়ে
              যেকোনো দিনের মিল সংশোধন করতে পারবেন।
            </p>
          ),
        },
        {
          question: 'নেক্সমেস কীভাবে মিল রেট ও প্রত্যেকের ব্যালেন্স হিসাব করে?',
          answerText:
            'মিল রেট = মোট বাজার খরচ ÷ মেসের সকল সদস্যের মোট মিল। প্রত্যেক সদস্যের মিল খরচ ও ফিক্সড খরচের অংশ মোট জমা থেকে বাদ দিয়ে নির্ভুল ব্যালেন্স বের করা হয়।',
          answer: (
            <p>
              সহজ ও স্বচ্ছ সূত্র:{' '}
              <code className="bg-nex-elevated rounded px-1.5 py-0.5 text-xs">
                মিল রেট = মোট বাজার খরচ ÷ মেসের সকল সদস্যের মোট মিল
              </code>
              । এরপর প্রত্যেক সদস্যের মোট মিল × মিল রেট + ফিক্সড খরচের অংশ (বাড়ি ভাড়া, খালা/বাবুর্চি,
              বিদ্যুৎ ও ইন্টারনেট বিল) যোগ করে তাঁদের মোট জমা থেকে বাদ দিয়ে নির্ভুল ব্যালেন্স বের করা হয়।
              <strong>লেনদেন নিষ্পত্তি (Settle Up)</strong> ট্যাবে কে কত টাকা পাবে বা দেবে তা তাৎক্ষণিক
              দেখা যায়।
            </p>
          ),
        },
        {
          question: 'কোনো সদস্য মেস থেকে চলে গেলে বা বহিষ্কৃত হলে পুরোনো মাসের হিসাব কি নষ্ট হয়?',
          answerText:
            'না। মাসের মাঝামাঝি কেউ চলে গেলে চলতি মাসের শেষ পর্যন্ত ফাইনান্স সামারিতে মেস ত্যাগ করেছেন ব্যাজসহ থাকবেন এবং পূর্ববর্তী সকল মাসের রিপোর্ট ও PDF ইতিহাসে তাঁর তথ্য চিরকাল সুরক্ষিত থাকবে।',
          answer: (
            <p>
              <strong>একদমই না!</strong> কেউ যদি মাসের মাঝামাঝি (যেমন ১৭ তারিখে) মেস ছেড়ে চলে যান,
              তাহলে সেই চলতি মাসের শেষ পর্যন্ত তিনি ফাইনান্স সামারিতে <code>[মেস ত্যাগ করেছেন]</code>{' '}
              ব্যাজসহ দৃশ্যমান থাকবেন যাতে তাঁর পাওনা-দেনা পরিষ্কারভাবে নিষ্পত্তি করা যায়। নতুন মাস শুরু
              হলে তিনি আর সক্রিয় তালিকায় থাকবেন না, কিন্তু <strong>লেনদেন ইতিহাস (History)</strong>-এ
              পূর্ববর্তী সকল মাসের রিপোর্ট এবং ডাউনলোড করা <strong>PDF</strong>-এ তাঁর সম্পূর্ণ তথ্য ও
              মিল হিসাব চিরকাল সুরক্ষিত থাকবে।
            </p>
          ),
        },
        {
          question: 'বাড়ি ভাড়া, খালা/বাবুর্চির বিল ও ইউটিলিটি খরচ আলাদাভাবে রাখা যায় কি?',
          answerText:
            'হ্যাঁ, ফিক্সড খরচ (Fixed Costs) ট্যাবে বাড়ি ভাড়া, খালা/বাবুর্চির বিল, গ্যাস, পানি, বিদ্যুৎ ও ইন্টারনেট বিল আলাদাভাবে যুক্ত ও ট্র্যাক করা যায়।',
          answer: (
            <p>
              হ্যাঁ! <strong>ফিক্সড খরচ (Fixed Costs)</strong> ট্যাবে আপনি প্রতি মাসের বাড়ি ভাড়া,
              খালা/বাবুর্চির বিল, গ্যাস, পানি, বিদ্যুৎ ও ইন্টারনেট বিল আলাদাভাবে যুক্ত করতে এবং
              পরিশোধিত (Paid) চিহ্নিত করতে পারবেন। এগুলো বাজার খরচের সাথে মিশবে না, বরং ওই মাসের সক্রিয়
              সদস্যদের মাঝে সমানভাবে বণ্টিত হবে।
            </p>
          ),
        },
        {
          question: 'সাপ্তাহিক বাজার শিডিউল ও খাবারের মেন্যু কীভাবে পরিচালিত হয়?',
          answerText:
            'বাজার ও মেন্যু পেজে এক ক্লিকে অটো বণ্টন ব্যবহার করে বাজারের পালা ভাগ করা যায় এবং সাপ্তাহিক দুপুর ও রাতের মেন্যু সেট করা যায়।',
          answer: (
            <p>
              <strong>বাজার ও মেন্যু</strong> পেজে ম্যানেজার এক ক্লিকে <em>অটো বণ্টন (Auto Assign)</em>{' '}
              ব্যবহার করে সপ্তাহের বাজারের দায়িত্ব সদস্যদের মধ্যে ভাগ করে দিতে পারেন। পাশাপাশি
              সাপ্তাহিক দুপুর ও রাতের খাবারের রুটিন সাজানো থাকলে সবাই ড্যাশবোর্ডেই আজকের ও আগামীকালের
              মেন্যু দেখতে পাবেন।
            </p>
          ),
        },
        {
          question: 'নেক্সমেস এআই (NexMessAI) কী কাজে লাগে?',
          answerText:
            'Google Gemini চালিত নেক্সমেস এআই স্থানীয় বাজার দর অনুমান, বাজেট অনুযায়ী মেন্যু পরিকল্পনা এবং বাজারের ফর্দ তৈরিতে রিড-অনলি সহায়তা দেয়।',
          answer: (
            <p>
              Google Gemini চালিত <strong>নেক্সমেস এআই</strong> আপনার মেসের এলাকা অনুযায়ী নিত্যপণ্যের
              সম্ভাব্য বাজার দর, নির্ধারিত বাজেটে কয়েকজনের জন্য স্বাস্থ্যকর রান্নার মেন্যু এবং বাজারের
              ফর্দ তৈরি করতে সাহায্য করে। নিরাপত্তার জন্য এটি কেবল রিড-অনলি (Read-only), অর্থাৎ এটি
              আপনার মেসের হিসাব বা খরচে কোনো পরিবর্তন করতে পারে না।
            </p>
          ),
        },
        {
          question: 'আমার মেসের ডেটা কি নিরাপদ এবং বাংলা ও অফলাইনে কি ব্যবহার করা যাবে?',
          answerText:
            'হ্যাঁ, সমস্ত ডেটা Supabase RLS ও Google OAuth দ্বারা সুরক্ষিত। নেক্সমেস সম্পূর্ণ বাংলা ও ইংরেজি ভাষা, লাইট/ডার্ক থিম এবং PWA অফলাইন সাপোর্ট করে।',
          answer: (
            <p>
              হ্যাঁ। সমস্ত ডেটা <strong>Supabase Row-Level Security (RLS)</strong> ও Google OAuth
              দ্বারা সুরক্ষিত—অর্থাৎ কেবল আপনার মেসের অনুমোদিত সদস্যরাই হিসাব দেখতে পারবেন। পাশাপাশি
              সেটিংস থেকে সম্পূর্ণ বাংলা ভাষা (উন্নত <em>হিন্দ শিলিগুড়ি</em> ফন্ট ও স্পষ্ট বাংলা সংখ্যা)
              এবং লাইট/ডার্ক থিম ব্যবহার করা যায় এবং PWA প্রযুক্তির কারণে দুর্বল নেটওয়ার্কেও অ্যাপটি
              দ্রুত কাজ করে।
            </p>
          ),
        },
      ]
    : [
        {
          question: 'What is NexMess and how does it help student or bachelor mess apartments?',
          answerText:
            'NexMess is a modern cloud-based mess and hostel management platform designed for roommates, flatmates, and student groups with real-time meal tracking, automated meal rate calculations, bazaar schedules, debt settlements, and group chat.',
          answer: (
            <p>
              <strong>NexMess</strong> is a modern cloud-based mess and hostel management platform
              designed for roommates, flatmates, and student groups. It eliminates manual paper logs
              and spreadsheet errors by providing real-time meal tracking, automated meal rate
              calculations, bazaar schedules, debt settlement sheets, and group chat.
            </p>
          ),
        },
        {
          question: 'How do daily meal tracking and cut-off locks work on NexMess?',
          answerText:
            'Members can toggle Lunch and Dinner meals and add guest counts for Today or Tomorrow. Meals lock automatically in Bangladesh Standard Time (UTC+6) at 10:00 AM for Lunch and 4:00 PM for Dinner, with Manager Override support.',
          answer: (
            <p>
              Members can toggle their <strong>Lunch</strong> and <strong>Dinner</strong> meals and
              add guest counts for Today or Tomorrow directly from the Dashboard or Meal Calendar. To
              prevent food waste, meals lock automatically based on Bangladesh Standard Time (UTC+6) at{' '}
              <strong>10:00 AM for Lunch</strong> and <strong>4:00 PM for Dinner</strong>. Mess
              managers can still use <em>Manager Override</em> anytime for special adjustments.
            </p>
          ),
        },
        {
          question: 'How does NexMess calculate the meal rate and individual balances?',
          answerText:
            'Meal Rate = Total Bazaar Expenses divided by Total Meals Eaten by All Members. Each member meal cost plus equal fixed cost share is subtracted from deposits for accurate balances and Settle Up transfers.',
          answer: (
            <p>
              The formula is transparent:{' '}
              <code className="bg-nex-elevated rounded px-1.5 py-0.5 text-xs">
                Meal Rate = Total Bazaar Expenses ÷ Total Meals Eaten by All Members
              </code>
              . Each member&apos;s meal cost plus their equal share of monthly fixed costs is deducted
              from their verified deposits to compute their exact balance and peer-to-peer settlement in
              the <strong>Settle Up</strong> sheet.
            </p>
          ),
        },
        {
          question: 'What happens to past reports if a member leaves or is removed from the mess?',
          answerText:
            'Historical data is always preserved. Mid-month leavers stay in the current month Finance Summary with a [LEFT] badge until month-end, and all past monthly archives and PDF reports keep their records permanently.',
          answer: (
            <p>
              <strong>Your historical data is always preserved.</strong> If a member leaves mid-month
              (for example, on the 17th), they remain visible in that month&apos;s Finance Summary with
              a <code>[LEFT]</code> badge until month-end so final dues can be settled. Starting next
              month, they disappear from active views, while all past monthly archives and{' '}
              <strong>PDF reports</strong> in the History tab keep their exact meal and deposit records
              intact.
            </p>
          ),
        },
        {
          question: 'Can we separate house rent, cook salary, and utilities from grocery bills?',
          answerText:
            'Yes. The Fixed Costs tab separates recurring shared bills like house rent, cook salary, gas, water, electricity, and internet from daily bazaar grocery costs.',
          answer: (
            <p>
              Yes! The <strong>Fixed Costs</strong> tab separates recurring shared bills—such as house
              rent, maid/cook salary, gas, utilities, and internet—from daily bazaar grocery costs. You
              can also track whether each bill is marked as Paid or Pending.
            </p>
          ),
        },
        {
          question: 'How does the bazaar schedule and weekly meal routine work?',
          answerText:
            'Under Market & Routine, managers can assign shopping dates manually or use Auto Assign for automatic weekly rotation and configure weekly Lunch and Dinner menus.',
          answer: (
            <p>
              Under <strong>Market &amp; Routine</strong>, managers can assign shopping dates manually
              or use <em>Auto Assign</em> for automatic weekly rotation. You can also configure a
              weekly Lunch &amp; Dinner menu so every roommate sees today&apos;s and tomorrow&apos;s
              dishes right on the Dashboard.
            </p>
          ),
        },
        {
          question: 'What can NexMessAI do?',
          answerText:
            'Powered by Google Gemini, NexMessAI estimates local market prices, generates smart shopping lists, and helps plan balanced mess meals within your budget in strict read-only mode.',
          answer: (
            <p>
              Powered by Google Gemini, <strong>NexMessAI</strong> helps you estimate local market
              prices based on your mess location, generate smart shopping lists, and plan balanced
              meals within your daily budget. It operates strictly read-only and never modifies your
              financial records.
            </p>
          ),
        },
        {
          question: 'Is NexMess free, secure, and available in Bengali & Offline mode?',
          answerText:
            'Yes. NexMess is free, secured with Supabase Row-Level Security (RLS) and Google OAuth, and supports English and Bengali localization, Light/Dark themes, and PWA offline caching.',
          answer: (
            <p>
              Yes! NexMess is free to use and protected by <strong>Supabase Row-Level Security (RLS)</strong>{' '}
              and Google OAuth. It supports full English and authentic Bengali (বাংলা) localization,
              smooth Light &amp; Dark themes, and PWA offline asset caching.
            </p>
          ),
        },
      ]

  useSEO({
    title: isBangla
      ? 'সাধারণ প্রশ্নোত্তর (FAQ) | নেক্সমেস'
      : 'Frequently Asked Questions (FAQ) | NexMess',
    description: isBangla
      ? 'নেক্সমেস কীভাবে কাজ করে? মিল রেট হিসাব, কাট-অফ টাইম, পুরোনো মেম্বার রিপোর্ট ও এআই বাজার সহকারী সম্পর্কে বিস্তারিত জানুন।'
      : 'Have questions about NexMess? Learn about meal rate calculations, 10 AM / 4 PM cut-off locks, member history archives, and AI features.',
    canonical: 'https://www.nexmess.shop/faq',
    robots: 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answerText,
        },
      })),
    },
  })

  return (
    <div
      className={`bg-nex-bg text-nex-text flex min-h-screen flex-col overflow-x-hidden select-none ${
        isBangla ? 'font-bangla' : 'font-sans'
      }`}
    >
      <PublicHeader />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 select-text sm:py-12">
        <div className="space-y-8">
          {/* Page Title & Intro */}
          <div className="border-nex-border/60 space-y-4 border-b pb-8 text-center sm:text-left">
            <div className="border-nex-primary/20 bg-nex-primary/10 text-nex-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400">
              <HelpCircle className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">
                {isBangla ? 'সহায়তা ও প্রশ্নোত্তর' : 'Support & FAQ'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {isBangla ? 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-nex-muted text-sm leading-relaxed">
              {isBangla
                ? 'দৈনিক মিল হিসাব, কাট-অফ সময়, বাজার খরচ বণ্টন, পুরোনো মেম্বারদের আর্কাইভ এবং এআই ফিচার সম্পর্কে আপনার সাধারণ প্রশ্নের উত্তর এখানে পাবেন।'
                : 'Find answers to common questions about managing daily meals, cut-off times, grocery costs, archived member reports, and our automation features.'}
            </p>
          </div>

          {/* Accordion FAQ Items */}
          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index
              return (
                <div
                  key={index}
                  className="bg-nex-surface border-nex-border overflow-hidden rounded-xl border transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFAQ(index)}
                    className="hover:bg-nex-hover/60 flex w-full cursor-pointer items-center justify-between p-5 text-left font-semibold transition-colors"
                  >
                    <span className="pr-4 text-sm sm:text-base">{item.question}</span>
                    {isOpen ? (
                      <ChevronUp className="text-nex-muted h-5 w-5 shrink-0" />
                    ) : (
                      <ChevronDown className="text-nex-muted h-5 w-5 shrink-0" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="text-nex-muted border-nex-border/60 bg-nex-elevated/40 space-y-2 border-t p-5 text-xs leading-relaxed sm:text-sm">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Need More Help Block */}
          <div className="border-nex-border bg-nex-surface mt-12 space-y-3 rounded-2xl border p-6 text-center shadow-sm">
            <div className="bg-nex-primary/10 text-nex-primary inline-flex h-10 w-10 items-center justify-center rounded-full dark:bg-emerald-500/15 dark:text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">
              {isBangla ? 'আরও কোনো প্রশ্ন আছে?' : 'Still have questions?'}
            </h3>
            <p className="text-nex-muted mx-auto max-w-md text-sm">
              {isBangla
                ? 'আপনার মেস সেটআপ বা কোনো সমস্যায় সাহায্যের প্রয়োজন হলে সরাসরি আমাদের সাথে যোগাযোগ করুন।'
                : 'Our support team is here to help you get your hostel or shared mess set up. Reach out to us directly.'}
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@nexmess.shop"
                className="nex-btn-primary inline-flex items-center justify-center px-6 py-2.5 text-xs font-bold"
              >
                {isBangla
                  ? 'সাপোর্ট ইমেইল (support@nexmess.shop)'
                  : 'Email Support (support@nexmess.shop)'}
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-nex-muted border-nex-border/50 mt-auto border-t px-6 py-8 text-center text-xs">
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <span>
            {isBangla
              ? `© ${formatNumber(new Date().getFullYear())} নেক্সমেস। সর্বস্বত্ব সংরক্ষিত।`
              : `© ${new Date().getFullYear()} NexMess Inc. All rights reserved.`}
          </span>
          <span className="text-nex-border/50 hidden sm:inline">|</span>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-nex-text transition-colors">
              {isBangla ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </Link>
            <Link to="/terms-of-service" className="hover:text-nex-text transition-colors">
              {isBangla ? 'শর্তাবলী' : 'Terms of Service'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
