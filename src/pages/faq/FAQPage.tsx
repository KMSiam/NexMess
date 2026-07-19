import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSEO } from '../../hooks/useSEO'
import logoIcon from '../../assets/logo-icon.svg'

interface FAQItem {
  question: string
  answer: React.ReactNode
}

export default function FAQPage() {
  useSEO({
    title: 'Frequently Asked Questions (FAQ) | NexMess',
    description:
      'Have questions about NexMess? Read our comprehensive FAQ to learn about meal rate calculations, roommate ledger distribution, automated bazaar schedules, and AI-powered grocery lists.',
    canonical: 'https://www.nexmess.shop/faq',
    robots: 'index, follow',
  })

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqItems: FAQItem[] = [
    {
      question: 'What is NexMess and how does it help student or bachelor mess apartments?',
      answer: (
        <p>
          NexMess (also referred to as <strong>Nex Mess</strong>) is a next-generation cloud-based mess and hostel dining management platform designed to help roommates, flatmates, and student groups coordinate daily meals, bazaar duties, and split living expenses automatically. In a typical bachelor mess or shared apartment, tracking who ate what meal and who paid for which grocery items can become chaotic. NexMess eliminates manual calculations, paper logs, and spreadsheet errors by offering real-time ledger synchronization, automated dining reports, and an AI-powered market assistant.
        </p>
      ),
    },
    {
      question: 'How does the daily meal tracking system work on NexMess?',
      answer: (
        <p>
          Meal tracking is the core feature of NexMess. Members can log their planned daily meals (breakfast, lunch, dinner) in advance. To prevent last-minute dining changes and grocery waste, workspace managers can set an automated daily cut-off timer (e.g., meals must be updated before 8:00 AM for lunch). The platform registers daily logs and aggregates the meal count across the entire mess workspace, giving the assigned bazaar manager an exact quantity of groceries to purchase.
        </p>
      ),
    },
    {
      question: 'How does NexMess calculate the meal rate and distribute individual balances?',
      answer: (
        <p>
          The formula for meal rate calculation is: <code>Meal Rate = Total Grocery/Bazaar Expenses / Total Meals Eaten by All Members</code>. At the end of the monthly billing cycle, the platform multiplies each member's personal meal count by this calculated rate to find their meal cost. The system then automatically tracks their payments (deposits) and other shared expenses to generate a final ledger detailing who needs to pay and who is owed money, completely eliminating spreadsheet errors.
        </p>
      ),
    },
    {
      question: 'Can we track shared expenses like house rent, utility bills, and cook salaries?',
      answer: (
        <p>
          Yes, NexMess has a robust expense manager that handles both dining and non-dining costs. Users can record fixed or recurring flat expenses such as house rent, electricity bills, internet subscriptions, and cook salaries. These utility bills can be split equally among all flatmates or distributed using customized ratios. This separation of "bazaar cost" and "utility cost" allows for clean, multi-layered financial settlements.
        </p>
      ),
    },
    {
      question: 'How does the automated bazaar schedule rotation work?',
      answer: (
        <p>
          Grocery shopping (bazaar) is one of the most tedious duties in a shared apartment. NexMess features an automated bazaar scheduling roster. Workspace managers can input member availability and rotation intervals, and the system automatically assigns bazaar duties, sends reminders, and tracks who is responsible for grocery purchases each day. This prevents conflicts and ensures a fair, transparent distribution of responsibilities.
        </p>
      ),
    },
    {
      question: 'Is my mess data safe, and can I access it offline?',
      answer: (
        <p>
          Absolutely. NexMess secures all data using Supabase Row-Level Security (RLS) policies and Google OAuth authentication, ensuring that only members of your specific mess workspace can view your financial records and dining histories. Additionally, NexMess utilizes service worker caching to provide offline accessibility, allowing users to view current meal sheets and logs even in low-connectivity environments.
        </p>
      ),
    },
    {
      question: 'What is the role of the AI Market Assistant in NexMess?',
      answer: (
        <p>
          The NexMess AI Assistant is built to optimize your shopping and dining logistics. Powered by Google Gemini and Supabase, it analyzes your historic mess bazaar data, predicts price trends for regional grocery items, automatically drafts grocery lists based on upcoming meals, and suggests balanced menu plans to fit your budget. It can even answer specific questions about local market rates to help you avoid overspending.
        </p>
      ),
    },
    {
      question: 'Is NexMess free to use, and how do I sign up?',
      answer: (
        <p>
          NexMess is completely free to use for standard student and bachelor messes. You can sign up in seconds using Google OAuth or email registration. Once registered, you can either create a new mess workspace and invite your roommates via a unique invite link, or join an existing mess using a code provided by your manager.
        </p>
      ),
    },
  ]

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 select-text">
        <div className="space-y-8">
          {/* Page Title & Intro */}
          <div className="border-nex-border/50 space-y-4 border-b pb-8 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-600 dark:text-blue-400">
              <HelpCircle className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">Support & FAQ</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h1>
            <p className="text-nex-muted text-sm leading-relaxed">
              Find answers to common questions about managing daily meals, sharing grocery costs, splitting utility bills, and using our automation features on the NexMess platform.
            </p>
          </div>

          {/* Accordion FAQ Items */}
          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index
              return (
                <div
                  key={index}
                  className="bg-nex-surface border-nex-border/50 rounded-xl border overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="flex w-full items-center justify-between p-5 text-left font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span className="text-sm sm:text-base pr-4">{item.question}</span>
                    {isOpen ? (
                      <ChevronUp className="text-nex-muted h-5 w-5 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="text-nex-muted h-5 w-5 flex-shrink-0" />
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
                        <div className="text-nex-muted border-nex-border/50 border-t p-5 text-xs sm:text-sm leading-relaxed space-y-2 bg-black/[0.02] dark:bg-white/[0.01]">
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
          <div className="border-nex-border/50 bg-nex-surface/30 rounded-2xl border p-6 text-center space-y-3 mt-12">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Still have questions?</h3>
            <p className="text-nex-muted text-sm max-w-md mx-auto">
              Our support team is here to help you get your hostel or shared mess set up. You can contact us directly.
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@nexmess.shop"
                className="bg-nex-primary hover:bg-nex-primary/95 shadow-nex-primary/20 inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-colors"
              >
                Email Support (support@nexmess.shop)
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-nex-muted border-nex-border/50 mt-auto border-t px-6 py-8 text-center text-xs">
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <span>&copy; {new Date().getFullYear()} NexMess Inc. All rights reserved.</span>
          <span className="text-nex-border/50 hidden sm:inline">|</span>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-nex-text transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-nex-text transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
