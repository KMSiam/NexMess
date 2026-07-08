import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'NexMess — Smart Mess Management',
    template: '%s | NexMess',
  },
  description:
    'NexMess is a modern mess management platform for tracking meals, expenses, deposits, and more.',
  keywords: ['mess management', 'meal tracker', 'expense tracker', 'hostel'],
  authors: [{ name: 'NexMess Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NexMess',
  },
  openGraph: {
    type: 'website',
    title: 'NexMess — Smart Mess Management',
    description: 'Modern mess management with real-time updates, expense tracking, and more.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4a6d56',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.variable}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--nex-surface)',
                color: 'var(--nex-text)',
                border: '1px solid var(--nex-border)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#4a6d56',
                  secondary: 'white',
                },
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
