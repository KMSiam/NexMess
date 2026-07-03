# ⚡ NexMess — Smart Mess Management

> Next-generation real-time mess management system for shared living. Track meals, split expenses, coordinate bazaar duty — all in one beautiful app.

📖 **[Read the NexMess Project Report](./NexMess_Project_Report.pdf)**

[![Project Report](https://img.shields.io/badge/Project_Report-PDF-red?logo=adobe-acrobat-reader&logoColor=white)](./NexMess_Project_Report.pdf)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

## ✨ Features

- 🍽️ **Meal Calendar** — Toggle Lunch/Dinner per day on a monthly grid with strict cut-off times
- 💰 **Finance Tracker** — Expenses, deposits, fixed costs, auto-calculated balances & greedy debt settle-up sheet
- 🛒 **Bazaar Scheduler** — Assign/auto-rotate market duty with weekly calendar view
- 💬 **Real-Time Chat** — Direct group messaging with active member profiles powered by Supabase Realtime
- 📲 **PWA & Push Notifications** — Installable Progressive Web App with background device notifications via Deno Edge Functions
- 📊 **PDF Report Exports** — Export monthly meal summary sheets, expense lists, and settlement flows to PDF using `jsPDF`
- 📅 **Routine Planner** — Daily schedules and cleaning routines management for the shared apartment
- 👥 **Member Management** — Enter via unique mess code, approval/rejection gates, and manager vs member role settings
- 🔐 **Secure Auth & Security** — Email/Password + Google OAuth, secure password recovery flows, and Row-Level Security (RLS) policies

## 🎨 Design

**Modern Ocean Blue Minimalist** — Glassmorphism sidebar, gradient primary buttons, subtle card shadows, custom Inter typography.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/KMSiam/NexMess.git
cd NexMess

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase URL and Anon Key

# Start development server
npm run dev
```

### Environment Variables

| Variable                 | Description                   |
| ------------------------ | ----------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

## 🏗️ Tech Stack

| Layer         | Technology                                                          |
| ------------- | ------------------------------------------------------------------- |
| Frontend      | React 19, TypeScript, Vite                                          |
| Styling       | Tailwind CSS v4, Custom Design System                               |
| State         | Zustand (persisted)                                                 |
| Backend       | Supabase (PostgreSQL, Auth, Realtime, Storage, Deno Edge Functions) |
| Routing       | React Router v7                                                     |
| PWA & SW      | Vite PWA Plugin, Custom Service Worker (`src/sw.ts`)                |
| PDF Reports   | jsPDF, jspdf-autotable                                              |
| Animations    | Framer Motion                                                       |
| Notifications | react-hot-toast, Web Push API (VAPID)                               |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/          # AppLayout, Sidebar, BottomNav
│   └── NotificationBell.tsx
├── guards/              # Route guards (Auth, Guest)
├── lib/                 # Supabase client, utilities
├── pages/               # Page components
│   ├── auth/            # Login, Register, Onboarding
│   ├── chat/            # Group chat
│   ├── dashboard/       # Main dashboard
│   ├── finance/         # Expense/Deposit/Fixed costs
│   ├── market/          # Bazaar scheduler
│   ├── meals/           # Meal calendar
│   ├── mess/            # Create/Join mess
│   ├── routine/         # Daily routines & cleaning scheduler
│   └── settings/        # Profile & member management
├── stores/              # Zustand state stores
└── types/               # TypeScript interfaces
```

## 📊 Database Schema

11 tables with full Row Level Security:
`profiles`, `messes`, `mess_members`, `meals`, `expenses`, `deposits`, `fixed_costs`, `market_schedules`, `chat_messages`, `notifications`, `push_subscriptions`

## 📄 License

MIT
