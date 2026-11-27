# NexMess Color System & Harmony Report

**Version:** `2.14.0`  
**Date:** November 27, 2026  
**Scope:** Application-wide color audit, Material Design 3 + Adobe Color theory alignment, WCAG 2.1 AA contrast compliance, and token unification across Light and Dark themes.

---

## 1. Executive Summary

Prior to this audit, NexMess had a strong core brand identity built around **Warm Ivory (`#FAF5F0`)**, **Warm Espresso (`#221E1A`)**, and **Forest Sage (`#4A6D56`)**, alongside an obsidian dark mode (`#0C0C0D`). However, dozens of pages and components still used generic default Tailwind colors (`blue-400/500/600` avatars, `indigo-500` icons/dinner slots, `purple-500` badges, `slate-400/700` and `zinc-800` cool neutrals) and split semantic error/success palettes (`red-*` vs `rose-*`, `green-*` vs `emerald-*`). Additionally, several light-mode semantic foreground tokens (`#10B981`, `#4A6D56` on `#161618`) fell below WCAG AA `4.5:1` contrast when rendered as text.

This update establishes a cohesive, warm editorial color system grounded in **Material Design 3** tonal surface roles and **Adobe Color** analogous + split-complementary harmony, applied across every page, component, modal, avatar, PDF export, and theme state while preserving all existing layouts and brand identity.

---

## 2. Research & Color Theory Foundations

### 2.1 Material Design 3 (M3) Tonal & Surface Architecture
- **Tonal Surface Hierarchy (No Pure Black/Harsh White Clashes):**
  - Light theme separates **Canvas** (`#FAF5F0` Warm Ivory), **Container Surface** (`#FFFFFF` Crisp White), **Elevated Recessed Container** (`#F5EFE7` Cream Stone), and **Hover Surface** (`#EFE8DE` Warm Sand) using warm `1px` limestone borders (`#E7DFD3`).
  - Dark theme avoids flat pure-black stacking by stepping elevation lightness from **Canvas** (`#0C0C0D`) → **Surface** (`#161618`) → **Elevated** (`#202023`) → **Hover** (`#27272C`) with warm charcoal borders (`#2C2B2E`).
- **Role-Based Contrast Pairing ("On" & Ink Roles):**
  - Solid brand CTAs preserve deep sage (`#4A6D56` → `#3A5643`) so white button text consistently meets `>= 5.81:1`.
  - Text/icon accents use theme-aware ink tokens (`--nex-primary-ink`: `#3A5643` in light mode, `#7BB991` in dark mode) so active links and navigation items always stay above `7.9:1` contrast.

### 2.2 Adobe Color Harmony & 60-30-10 Allocation
- **Primary Brand Hue (`~140°`):** **Forest Sage (`#4A6D56`)** — organic, calm, and distinctive.
- **Analogous Secondary (`~166°`):** **Botanical Teal (`#2E5E54` light / `#62AB99` dark)** — harmonizes naturally beside Forest Sage on the color wheel for Dinner slots, Notices, History, and Calendar accents, replacing jarring generic `blue-*` and `indigo-*`.
- **Split-Complementary Warm Tertiary (`~36°`):** **Warm Ochre / Amber (`#B45309` light / `#FBBF24` dark)** — warm earthy counterpoint for Lunch slots, Fixed Bills, Bazaar alerts, and Spend totals.
- **60-30-10 Balance:**
  - **60% Neutrals:** Warm Ivory / Cream Stone (light) and Midnight Obsidian / Warm Charcoal (dark).
  - **30% Structural Contrast:** Warm Espresso (`#221E1A`) / Warm Taupe (`#6B6258`) in light mode; Warm Off-White (`#F4F3F0`) / Warm Ash (`#9D9790`) in dark mode.
  - **10% Accents & Semantics:** Forest Sage primary actions, Botanical Teal secondary, Warm Ochre warnings, Forest Emerald success, and Terracotta Rose destructive states.

---

## 3. Selected Color Palette Specification

### 3.1 Core Tokens (`src/index.css`)

| Role | CSS Variable | Light Mode | Dark Mode | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `--nex-primary` | `#4A6D56` | `#4A6D56` | Primary buttons, active switches, solid badges |
| **Primary Dark** | `--nex-primary-dark` | `#3A5643` | `#3A5643` | Button hover / gradient anchor |
| **Primary Ink** | `--nex-primary-ink` | `#3A5643` | `#7BB991` | High-contrast active text, links, nav labels |
| **Primary Tint** | `--nex-primary-light` | `#EDF2EE` | `rgba(110, 158, 127, 0.14)` | Active nav backgrounds, today highlights |
| **Secondary** | `--nex-secondary` | `#2E5E54` | `#62AB99` | Dinner indicators, notices, calendar & history icons |
| **Secondary Tint** | `--nex-secondary-light` | `#E8F1EE` | `rgba(98, 171, 153, 0.14)` | Dinner slots, secondary feature containers |
| **Canvas** | `--nex-bg` | `#FAF5F0` | `#0C0C0D` | Page backdrop |
| **Surface** | `--nex-surface` | `#FFFFFF` | `#161618` | Cards, modals, dropdowns |
| **Elevated** | `--nex-elevated` | `#F5EFE7` | `#202023` | Recessed panels, table headers, input fills |
| **Hover** | `--nex-hover` | `#EFE8DE` | `#27272C` | Interactive row/button hover surfaces |
| **Border** | `--nex-border` | `#E7DFD3` | `#2C2B2E` | Warm `1px` hairlines & dividers |
| **Text Primary** | `--nex-text` | `#221E1A` | `#F4F3F0` | Headings and primary body copy |
| **Text Muted** | `--nex-muted` | `#6B6258` | `#9D9790` | Subtitles, timestamps, metadata |
| **Success** | `--nex-success` | `#16794C` | `#34D399` | Positive balances, verified deposits, paid bills |
| **Success Tint** | `--nex-success-light` | `#ECFDF5` | `rgba(52, 211, 153, 0.14)` | Verified status pills & confirmation banners |
| **Warning** | `--nex-warning` | `#B45309` | `#FBBF24` | Lunch slots, pending items, fixed costs, alerts |
| **Warning Tint** | `--nex-warning-light` | `#FEF3C7` | `rgba(251, 191, 36, 0.14)` | Lunch badges, pending/leave-mess callouts |
| **Danger** | `--nex-danger` | `#E11D48` | `#FB7185` | Negative balances, errors, destructive actions |
| **Danger Tint** | `--nex-danger-light` | `#FFF1F2` | `rgba(251, 113, 133, 0.14)` | Destructive badges, error alerts, danger zone |

### 3.2 Reusable Avatar & PDF Tokens
- **Member Avatars (`.nex-avatar`):** `linear-gradient(135deg, #3A5643, #5F886E)` — replaces 11 instances of generic `from-blue-400 to-blue-600` / `from-indigo-500 to-blue-600`.
- **Mess Avatars (`.nex-avatar-mess`):** `linear-gradient(135deg, #2B4032, #4A6D56)` — replaces 4 instances of `from-blue-500 to-blue-600`.
- **Muted Chat Fallback (`.nex-avatar-muted`):** `linear-gradient(135deg, #70675D, #94897D)` — replaces cool `from-slate-300 to-slate-400`.
- **PDF Secondary Header (`src/lib/reportPdf.ts`):** Warm Espresso Charcoal (`rgb(68, 62, 56)` / `#443E38`) replaces cool Slate (`rgb(71, 85, 105)`), and semantic Emerald/Rose/Muted values match web tokens.

---

## 4. WCAG 2.1 AA Contrast Verification

Calculated luminance contrast ratios across all primary, surface, and semantic pairings:

| Foreground on Background | Hex Pair | Contrast Ratio | WCAG Result |
| :--- | :--- | :---: | :---: |
| Light Text on Card Surface | `#221E1A` on `#FFFFFF` | **16.55:1** | AAA |
| Light Text on Canvas | `#221E1A` on `#FAF5F0` | **15.28:1** | AAA |
| Light Muted on Card Surface | `#6B6258` on `#FFFFFF` | **5.98:1** | AA |
| Light Muted on Canvas | `#6B6258` on `#FAF5F0` | **5.52:1** | AA |
| Light Primary Ink on Surface | `#3A5643` on `#FFFFFF` | **8.10:1** | AAA |
| White on Primary Button | `#FFFFFF` on `#4A6D56` | **5.81:1** | AA |
| Light Secondary on Surface | `#2E5E54` on `#FFFFFF` | **7.38:1** | AAA |
| Light Success on Surface | `#16794C` on `#FFFFFF` | **5.42:1** | AA |
| Light Warning on Surface | `#B45309` on `#FFFFFF` | **5.02:1** | AA |
| Light Danger on Surface | `#E11D48` on `#FFFFFF` | **4.70:1** | AA |
| White on Danger Button | `#FFFFFF` on `#E11D48` | **4.70:1** | AA |
| Dark Text on Card Surface | `#F4F3F0` on `#161618` | **16.29:1** | AAA |
| Dark Text on Canvas | `#F4F3F0` on `#0C0C0D` | **17.62:1** | AAA |
| Dark Muted on Card Surface | `#9D9790` on `#161618` | **6.25:1** | AA |
| Dark Primary Ink on Surface | `#7BB991` on `#161618` | **7.91:1** | AAA |
| Dark Secondary on Surface | `#62AB99` on `#161618` | **6.72:1** | AA |
| Dark Success on Surface | `#34D399` on `#161618` | **9.40:1** | AAA |
| Dark Warning on Surface | `#FBBF24` on `#161618` | **10.83:1** | AAA |
| Dark Danger on Surface | `#FB7185` on `#161618` | **6.71:1** | AA |

---

## 5. Summary of Applied Codebase Updates

- **Core Theme & Entry:**
  - `src/index.css`: Added theme-aware semantic variables (`--nex-primary-ink`, `--nex-secondary`, `--nex-secondary-light`, `--nex-warning-light`, theme-adaptive `--nex-success`, `--nex-warning`, `--nex-danger`), warm stone borders/elevations, warm dark toggle surface (`#353439`), and `.nex-avatar*` classes.
  - `src/App.tsx` & `src/main.tsx`: Synced toast notification icons (`var(--nex-success)`, `var(--nex-danger)`) and error fallback tokens (`#e7dfd3`, `#6b6258`).
  - `src/lib/reportPdf.ts`: Aligned secondary table accents, borders, muted text, emerald, and rose RGB colors with the web palette.
- **Navigation, Auth & Guards:**
  - `src/components/layout/AppLayout.tsx`: Replaced blue user/mess avatars and verified badge with `.nex-avatar`, `.nex-avatar-mess`, and `bg-nex-primary`, plus `text-nex-primary-ink` active nav states and `text-nex-danger` sign-out states.
  - `src/guards/AuthGuard.tsx`, `src/pages/auth/ForgotPasswordPage.tsx`, `src/pages/auth/UpdatePasswordPage.tsx`: Unified `green-*` and `red-*` feedback banners to `nex-success` and `nex-danger` semantic tokens.
- **Dashboard & Landing:**
  - `src/pages/dashboard/DashboardPage.tsx`, `WelcomeCard.tsx`, `CookSummary.tsx`, `NoticeBoard.tsx`, `StatsGrid.tsx`, `AlertBanners.tsx`, `EmergencyContacts.tsx`: Removed all `indigo-*`, `blue-*`, `slate-*`, and `red-*` classes; adopted `.nex-avatar*`, `text-nex-secondary`, `text-nex-primary-ink`, `text-nex-success`, `text-nex-warning`, and `text-nex-danger`.
  - `src/pages/landing/LandingPage.tsx`: Replaced `slate-*`, `blue-*`, `purple-*`, and `indigo-*` feature badges and avatar chips with warm stone, botanical teal, forest emerald, warm ochre, and forest sage.
- **Meals, Market, Finance, Chat, Activity & Settings:**
  - `src/pages/meals/MealsPage.tsx`: Replaced all `indigo-*` Dinner stats, calendar badges, cut-off dots, and override icons with `nex-secondary` / `nex-secondary-light`, and unified Lunch with `nex-warning` / `nex-warning-light`.
  - `src/pages/market/components/BazaarSchedule.tsx`, `AIMarketAssistant.tsx`, `foodIcons.ts`: Unified member avatars with `.nex-avatar`, replaced `blue-*`/`purple-*` prompt chips, and replaced `red-*` food badges with warm terracotta (`orange-800/900`).
  - `src/pages/finance/components/DepositTab.tsx`, `ExpenseTab.tsx`, `FixedCostTab.tsx`, `HistoryTab.tsx`, `SummaryTab.tsx`, `FinanceOverview.tsx`: Removed all `blue-*` buttons/hovers/avatars and unified `red-*` / `amber-*` / `emerald-*` text with `nex-danger`, `nex-warning`, `nex-success`, and `nex-secondary`.
  - `src/pages/activity/ActivityLogPage.tsx`, `src/pages/chat/components/ChatBubble.tsx`, `src/pages/mess/JoinMessPage.tsx`: Unified timeline category chips, muted chat avatars (`.nex-avatar-muted`), and pending mess cards.
  - `src/pages/settings/SettingsPage.tsx`, `MemberManagement.tsx`, `MessDetailsSection.tsx`, `ProfileSection.tsx`, `PreferencesSection.tsx`, `DangerZone.tsx`, `PushNotificationSection.tsx`: Unified avatars, verified badges, action buttons, dark-mode theme icon card (`#202023`), danger-zone containers, and push permission badges.
