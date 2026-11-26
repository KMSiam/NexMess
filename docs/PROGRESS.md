# 📋 NexMess — Development Progress Log

> **Current Version:** `2.4.0` (`package.json` single source of truth via `APP_VERSION`)  
> **Repository:** `KMSiam/NexMess` (`main`) · **Live App:** `https://www.nexmess.shop`  
> **Companion Docs:** [ROADMAP.md](./ROADMAP.md) · [README.md](../README.md) · [SECURITY.md](./SECURITY.md)

---

## 📅 Session Log — November 25–26, 2026 (`v1.27.0` → `v2.4.0`)

### Summary of Completed Work

| Version | Commit | Focus Area | Key Changes |
| :--- | :--- | :--- | :--- |
| **v2.0.0** | `28eb415` | Security Hardening, Stack Cleanup & UX Polish | Audited full stack (`26` findings documented), retired `nexmess-next` references, patched `18/22` npm advisories (`0` Critical/High/Low/Runtime left), hardened client XSS/auth/PII/error handling + local Edge Functions, and polished Desktop/Tablet/Mobile UX across 25 files. |
| **v2.0.0** | `f7019ce` | Dynamic Versioning | Centralized `APP_VERSION` in `src/lib/version.ts` sourced at build/test time from `package.json` (`vite.config.ts`, `vitest.config.ts`, `index.html`, Settings, Landing, Privacy, Terms, Sentry, + `version.test.ts`). |
| **v2.1.0** | `fcc8b56`, `10e18b5` | Smooth Sidebar & Drawer Motion | Optimized sidebar collapse/expand (`w-[72px]` ↔ `w-64`, smooth width easing, stable icon alignment, border-anchored chevron toggle) and mobile `More` drawer `<AnimatePresence>` transitions. |
| **v2.2.0** | `2a0080d` | Settings Tabs Slider & Collapsed Logout | Kept all 6 Settings tabs in a single-line horizontal slider (`scrollbar-none`, resize-aware edge chevrons, `scrollIntoView`), prevented `<main>` horizontal expansion (`min-w-0`), and added a dedicated visible Sign Out button in the collapsed `72px` sidebar footer. |
| **v2.3.0** | `03de303` | NexMessAI & Chat Scrolling Fix | Switched `<main>` to `overflow-x-clip` (`AppLayout.tsx`), constrained `AIMarketAssistant` grid rows (`grid-rows-[minmax(0,1fr)]` + `min-h-0` + scrollable left column), and ensured chat input bars remain visible and pinned inside short laptop & mobile viewports. |
| **v2.4.0** | `cac0a4b` | Mobile Pull-to-Refresh Restore | Replaced `overscroll-behavior-y: none` with `overscroll-behavior-y: auto` on `html`/`body`, and switched `body` plus public page wrappers (`LandingPage`, `FAQPage`, `PrivacyPage`, `TermsPage`) from `overflow-x-hidden` to `overflow-x-clip` so native mobile scroll-down refresh works cleanly. |
| **v2.4.0** | *(this update)* | Repo Cleanup & Progress Tracking | Removed tracked VitePWA dev cache `dev-dist/` and added `dev-dist` to `.gitignore`; updated `ROADMAP.md` and created `PROGRESS.md`. |

---

### Detailed Breakdown

#### 1. Technology Cleanup & Dependency Alignment
- **Retired Prototype Excluded:** Confirmed zero links, dependencies, routes, or configs in active `NexMess` connect to retired `nexmess-next` (`Clerk`, `Neon`, `Drizzle`, `Cloudflare R2`, `Pusher`).
- **Removed Obsolete Files & Packages:**
  - Deleted unused Tailwind v3 `tailwind.config.js` and starter SVG assets (`public/icons.svg`, `src/assets/react.svg`, `src/assets/vite.svg`).
  - Uninstalled unused devDependencies `autoprefixer` and `@testing-library/react`.
  - Removed tracked Vite dev SW cache (`dev-dist/registerSW.js`) and ignored `dev-dist` in `.gitignore`.
- **Vulnerability Patching (`npm audit fix`):** Reduced total npm advisories from **22** (`0` Crit, `6` High, `14` Mod, `2` Low) to **4 Moderate dev/build-only advisories** (`vite-plugin-pwa` → `workbox-build`, `0` Runtime vulnerabilities).

#### 2. Security Remediation Completed in Code (`v2.0.0`)
- **XSS / URL Sinks (`SEC-011`, `SEC-026`):** Added `isSafeHttpUrl()` and tightened `isSafeUrl()` in `src/lib/utils.ts`; enforced safe URL checks across `ExpenseTab`, `ChatBubble`, `FinancePage`, `ProfileSection`, `MemberManagement`, and `src/sw.ts` (`resolveSafeSwUrl()`).
- **Telemetry PII Masking (`SEC-017`):** Enabled `maskAllText`, `blockAllMedia`, `maskAllInputs` in Sentry Replay (`src/lib/sentry.ts`), masked PostHog inputs/attributes + scrubbed PII fields (`src/lib/analytics.ts`), and passed pseudonymous user IDs only in `src/App.tsx`.
- **Client Auth & Input (`SEC-020`, `SEC-022`, `SEC-023`):** Sanitized `next` callback redirects (`AuthCallbackPage`), replaced signup email enumeration toast (`RegisterPage`), required current password re-auth outside recovery flows (`UpdatePasswordPage`), switched `generateMessCode()` and `generateSafeFileName()` to CSPRNG (`crypto`), sanitized DB errors via `sanitizeAppError()`, standardized `isApprovedManager()` checks, fixed `user_id`-based bazaar duty checks (`useDashboardData`), aligned Zod schemas (`schemas.ts`) & ID doc upload MIME types (`ProfileSection`), and added `src/lib/__tests__/security.test.ts`.
- **Local Edge Function Patches *(Not Yet Cloud-Deployed)*:** Hardened CORS allowlists, constant-time secret verification, membership validation, `x-goog-api-key` header usage, safe push URL checks, `'bazaar_reminder'` notification key, and `mailto:` email validation across `supabase/functions/{market-assistant,morning-reminder,send-push,send-feedback-email}`.

#### 3. UI/UX & Responsiveness Improvements (`v2.0.0` – `v2.4.0`)
- **Shell & Navigation:** 92% `.nex-glass` chrome opacity, z-index layering, `72px` tablet compact sidebar collapse (`<1024px`), smooth CSS width/opacity transitions, always-visible Sign Out icon in collapsed footer, Framer Motion mobile `More` drawer animations, auth-aware `PublicHeader` & `NotFoundPage`, and deduplicated `NotificationBell` emojis.
- **Dashboard & Meals:** Clean `MY MEALS` layout without toggle/lock wrapping (`MealSelector`), clearer divider dot (`WelcomeCard`), unified KPI colors, zero mobile calendar overflow, cutoff legend bar, and interactive `All Members` **Day Breakdown Modal** (`MealsPage`).
- **Finance, Market & Activity:** Mobile `2×2` KPI grid (`FinanceOverview`), modal/bottom-sheet expense/deposit/fixed-cost/assign forms with Esc dismissal, themed `<ConfirmDialog>` instead of `window.confirm()`, PDF export from both Summary & History tabs, live search + category filter chips + `Show More` pagination on `ActivityLogPage`, and header-docked `Support & Contact` button pre-filled with logged-in profile details on `SettingsPage`.
- **Settings, AI, Chat & Mobile Gesture Fixes:** Single-line horizontal tab slider on Settings (`v2.2.0`), fixed `NexMessAI` & `ChatPage` vertical scroll + visible input bars (`v2.3.0`), polished AI Markdown tables (`MarkdownRenderer`), and restored native mobile pull-to-refresh (`v2.4.0`).

---

### Verification Snapshot (`v2.4.0`)
- **Typecheck (`npm run type-check`):** Passed (`0` errors)
- **Lint (`npm run lint`):** Passed (`0` errors; `6` pre-existing warnings in `analytics.ts`, `sentry.ts`, `main.tsx`)
- **Unit Tests (`npm test`):** `8` test files, `38/38` tests passed (`analytics`, `cutoff`, `fileValidator`, `finance`, `i18n`, `security`, `theme`, `version`)
- **Production Build (`npm run build`):** Passed (`dist/` built with `74` PWA precache entries, `APP_VERSION` = `2.4.0`)
- **Browser Preview (`http://localhost:4173`):** Visually verified across Desktop (`1280×650`, `1280×800`, `1366×768`), Tablet (`1024×768`), and Mobile (`390×844`) with `0` console errors and `0` failed local HTTP requests.

---

## ⏳ Next Up / Pending Actions (For Next Session)

### High Priority — Production Rollout & Security Approvals
- [ ] **Deploy `v2.4.0` Frontend to Vercel (`www.nexmess.shop`):** Push live build so all UX, version, scroll, and mobile pull-to-refresh updates take effect on production.
- [ ] **Supabase SQL Security Migrations *(Requires Review/Approval)*:**
  - Lock down `archive_monthly_report` / `cron_archive_previous_month` execution and add `is_mess_member` checks to `calculate_member_balance` / `calculate_meal_rate` (`SEC-001`, `SEC-006`).
  - Replace permissive `SELECT USING (true)` on `profiles` / `messes` (`SEC-005`, add `find_mess_by_code` RPC).
  - Protect `profiles.is_verified` via trigger & stop OAuth auto-verify (`SEC-007`), close `meals` delete cut-off & financial CHECK constraints (`SEC-008`), guard `deposits` / `mess_members` / `max_members` / `monthly_reports` / soft-delete RLS (`SEC-019`).
  - Pin `search_path` on 14 DB functions & add policy/revoke on `monthly_reports_cron_log` (`SEC-016`, `SEC-026`).
- [ ] **Synchronize & Deploy Hardened Edge Functions (`SEC-002`, `SEC-009`, `SEC-010`, `SEC-015`):**
  - Provision `INTERNAL_PUSH_SECRET`, `CRON_SECRET`, and `ALLOWED_ORIGIN` in Supabase Vault/Edge Secrets and update `tr_send_push_notification()` + `morning-bazaar-reminder` cron headers before deploying all 4 Edge Functions.
- [ ] **Supabase Auth, Headers & Storage Migration (`SEC-012`, `SEC-018`, `SEC-020`):**
  - Enable **Leaked Password Protection** in Supabase Auth settings.
  - Add security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `CSP Report-Only` -> enforcing CSP) in `vercel.json`.
  - Add file size/MIME limits on `chat-media` and plan signed-URL migration before toggling `receipts` & `chat-media` buckets private.
- [ ] **Rotate Legacy Neon Password (if applicable):** Verify in Neon Console that any legacy cluster credentials from retired `nexmess-next/scripts/*.mjs` are rotated or deleted.

### Medium Priority — Telemetry, Billing & Tooling
- [ ] **PostHog `400` Ingestion Check:** Verify `VITE_POSTHOG_KEY` & `VITE_POSTHOG_HOST` in Vercel against the PostHog US project settings.
- [ ] **Gemini Search Grounding Quota:** Refill Google Cloud/Gemini billing prepayment if live search grounding prices in `NexMessAI` show fallback notices.
- [ ] **Playwright Local Binary:** Run `npx playwright install chromium` locally before running `npm run test:e2e`.
- [ ] **Optional Enhancement:** Add quick self-service guest `+`/`-` popover directly inside the `/meals` `My Meals` monthly calendar.

### Long-Term Commercial Roadmap
- See [ROADMAP.md](./ROADMAP.md) for **Phase 5** (Google Play Store TWA) and **Phase 2** (bKash/Nagad/Stripe subscriptions & Pro gating).
