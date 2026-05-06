# ⚡ NexMess — Smart Mess Management

> Next-generation real-time mess management system for shared living. Track meals, split expenses, coordinate bazaar duty — all in one beautiful app.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

## ✨ Features

- 🍽️ **Meal Calendar** — Toggle Lunch/Dinner per day on a monthly grid
- 💰 **Finance Tracker** — Expenses, deposits, fixed costs & auto-calculated balance
- 🛒 **Bazaar Scheduler** — Assign/auto-rotate market duty with weekly view
- 💬 **Real-Time Chat** — Group messaging with Supabase Realtime
- 🔔 **Notifications** — Live alerts for expenses, join requests, bazaar duty
- 👥 **Member Management** — Join via code, approve/reject, role-based permissions
- 🔐 **Secure Auth** — Email/Password + Google OAuth with RLS-protected data

## 🎨 Design

**Modern Ocean Blue Minimalist** — Glassmorphism sidebar, gradient primary buttons, subtle card shadows, custom Inter typography.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/NexMess.git
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

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, Custom Design System |
| State | Zustand (persisted) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Routing | React Router v7 |
| Animations | Framer Motion |
| Notifications | react-hot-toast |

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
│   └── settings/        # Profile & member management
├── stores/              # Zustand state stores
└── types/               # TypeScript interfaces
```

## 📊 Database Schema

10 tables with full Row Level Security:
`profiles`, `messes`, `mess_members`, `meals`, `expenses`, `deposits`, `fixed_costs`, `market_schedules`, `chat_messages`, `notifications`

## 📄 License

MIT
