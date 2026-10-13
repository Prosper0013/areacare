# AreaCare

On-demand household waste pickup. Members register their home, pay a registration fee and monthly dues through **Flutterwave**, and press **Trash filled** when their bin is full. Management and the crew assigned to that area are alerted instantly with the member's house details and live location.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Drizzle ORM and PostgreSQL. Designed to run free on **Vercel + Neon** (or Supabase).

---

## What's inside

| Who | What they can do |
| --- | --- |
| **Member** | Sign up → add house details and pin their gate on a map → pay ₦5,000 registration (covers the first month) → press **Trash filled** → watch the request move from *sent* to *crew assigned* to *on the way* to *collected* → pay monthly dues (1, 3, 6 or 12 months at a time). **Payments page**: total paid, paid-through date, next payment due, full history with filters, a printable receipt (save as PDF) for every payment, and recent payments on the home dashboard. |
| **Crew (staff)** | Live board of open requests in the zones their team covers, with map, address, landmark, notes, **Directions** (Google Maps) and **Call** buttons. Accept → Start trip → Mark collected. |
| **Management (admin)** | Same live board across **all** zones; receives every Trash filled alert; can cancel requests. |
| **Super admin** | Everything above, plus: **Overview** (open requests, active/overdue members, money received this month, 14-day request chart, money received per month, whose dues end this week, who is overdue). **Payments** (every payment from every member, totals, pending and failed checkouts, filters by name/reference/status/type/date, **CSV export** for accounting). **Member profiles** (contact, house and map pin, membership dates, total paid, all payments and receipts, all pickup requests, change role, suspend, and **record a cash or bank-transfer payment**, which extends membership and gives the member a receipt). Plus teams, zones, roles and fees. |

**Pickup flow, start to finish:**

1. Member presses **Trash filled** → management and the zone's crew are alerted.
2. Crew taps **Accept**, then **Start trip** → the member is told the crew is on the way.
3. At the house, the crew taps **Report cleared** (optionally adding a note like "emptied 2 bags").
4. The member is asked **"Has your bin been cleared?"** and keeps getting buzzed until they answer:
   - a phone push notification with **Yes, it's cleared** / **Not cleared** buttons (works with the app closed) — repeated every 30 minutes;
   - inside the app, a prompt on the home screen and a yellow strip on every other page, with vibration, a chime and a flashing tab title.
5. **Yes** → the pickup closes as *Cleared · confirmed*, and the crew and management are notified.
   **Not cleared** → the request goes straight back to the crew as an urgent alert (with the member's note), and the cycle repeats.
6. If the member still hasn't answered after 12 reminders (~6 hours), management gets one alert to follow up by phone, and can **Confirm for member** from the request page.

The member can't raise a new request until they've answered, so every pickup ends with a clear yes or no. "Cleared · confirmed" (with who confirmed and when) shows on the member's home screen and history, on the crew board under **Cleared today**, on the request page, on the member's profile, and as a count on the admin Overview.

**Notifications** go out three ways when someone presses Trash filled:
1. In-app alert bell (refreshes every 10–20 s, with a sound and pop-up).
2. Phone/desktop **push notifications** — they arrive even when the app is closed (members and crew tap "Turn on alerts" once per device).
3. **Email** (optional, via Resend's free tier).

**Daily cron job** (`/api/cron/daily`, runs 6:00 UTC via Vercel Cron):
- Keeps the free database awake (Supabase pauses free projects after 7 idle days).
- Moves members whose dues have lapsed to *overdue* and notifies them.
- Sends a reminder 3 days before dues run out.

A backup GitHub Actions workflow (`.github/workflows/keep-alive.yml`) pings the same job every 3 days.

**Confirmation reminders** (`/api/cron/reminders`) run every 30 minutes through a free GitHub Actions workflow (`.github/workflows/reminders.yml`), because Vercel's free plan only allows a daily cron. The app also sends due reminders by itself whenever crews or members have it open, so reminders keep flowing even before the GitHub workflow is set up.

---

## Setup (about 30 minutes)

### 1. Put the code on GitHub
1. On github.com create a new **empty** repository called `areacare`.
2. Unzip this project, then in a terminal inside the folder:
   ```bash
   git init
   git add .
   git commit -m "Initial AreaCare app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/areacare.git
   git push -u origin main
   ```
   (Or use GitHub Desktop / drag-and-drop upload on github.com — don't upload `node_modules` if you created one.)

### 2. Create the free database

#### Option A — Neon (simplest)
1. Neon console → your project → **Connect** (top right). Database: `neondb`.
2. With **Connection pooling ON**, copy the string → this is `DATABASE_URL` (its host contains `-pooler`).
3. Switch **Connection pooling OFF**, copy again → this is `DIRECT_URL`.
4. Open **SQL Editor**, paste the whole of **`neon-setup.sql`** (in this project's root folder) and click **Run**. That creates every table, the fees, the Abuja zones and a starter crew — no terminal needed.
5. Skip step 3 below. After deploying, **sign up in the app with your `SUPER_ADMIN_EMAIL`** — that account becomes the super admin automatically.

Paste Neon's strings exactly as shown, including `?sslmode=require&channel_binding=require`; the app adjusts them for its database driver. Neon pauses idle compute after a few minutes and wakes it on the next request (the first page load after a quiet spell can take a second longer); your data is never deleted.

#### Option B — Supabase
1. Sign up at **supabase.com** → **New project**. Pick the region closest to Nigeria (e.g. *West EU* or *Central EU*). Save the database password.
2. Open **Connect** (top bar) → **ORMs / Connection string**:
   - Copy the **Transaction pooler** URL (port **6543**) → this is `DATABASE_URL`.
   - Copy the **Session pooler** or **Direct** URL (port **5432**) → this is `DIRECT_URL`.
   - Replace `[YOUR-PASSWORD]` in both with your database password.

### 3. Create the tables and the super admin (Supabase, or Neon from a terminal)
Skip this if you ran `neon-setup.sql`. Otherwise, on your computer (needs Node.js 20+):
```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL, DIRECT_URL, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
npm run db:migrate          # creates all tables
npm run db:seed             # default fees, 8 Abuja zones, a "Central crew" team, and your super admin login
```
The seed is safe to run again. Edit the zone list in `scripts/seed.ts` first if you serve a different city — or add/remove zones later from **Teams & zones** in the app.

### 4. Flutterwave
1. Log in at **dashboard.flutterwave.com** → **Settings → API Keys**. Copy the **Secret key** (start with the *Test* key `FLWSECK_TEST-…`, switch to Live when you're ready).
2. **Settings → Webhooks**:
   - URL: `https://YOUR-APP.vercel.app/api/payments/webhook`
   - Secret hash: any random string — put the same value in `FLW_SECRET_HASH`.
   - Tick *Receive webhook for successful/failed transactions*.

### 5. Push notification keys
```bash
npm run vapid
```
Copy the public key to `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key to `VAPID_PRIVATE_KEY`.

### 6. Deploy on Vercel
1. **vercel.com → Add New → Project → Import** your `areacare` GitHub repo. Framework is detected as Next.js; keep defaults.
2. Before clicking Deploy, open **Environment Variables** and add every key from `.env.example`:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_APP_URL` | `https://areacare.vercel.app` (your real Vercel URL, no trailing slash) |
   | `DATABASE_URL` / `DIRECT_URL` | from step 2 |
   | `AUTH_SECRET` | output of `openssl rand -base64 48` (any 32+ char random string) |
   | `SUPER_ADMIN_EMAIL` | your email |
   | `FLW_SECRET_KEY` / `FLW_SECRET_HASH` | from step 4 |
   | `CRON_SECRET` | another random string |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | from step 5 |
   | `RESEND_API_KEY` / `EMAIL_FROM` | optional |

3. Deploy. If you only learn your final URL after the first deploy, update `NEXT_PUBLIC_APP_URL` and **Redeploy**.
4. Vercel picks up the cron job from `vercel.json` automatically (**Settings → Cron Jobs** shows it).

### 7. Turn on the 30-minute reminders (GitHub Actions)
GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:
- `APP_URL` — your Vercel URL, e.g. `https://areacare.vercel.app`
- `CRON_SECRET` — the same value you set in Vercel

That switches on both workflows: confirmation reminders every 30 minutes, and the backup database keep-alive. You can check they run under the repo's **Actions** tab.

---

## Running the business day to day

1. **Log in** with your super admin email.
2. **Teams & zones** — create a team per area (e.g. *Gwarinpa crew*), tick the zones it covers.
3. Crew members **sign up normally**, then on **People** change their role to *Crew* and tap the team(s) they belong to. Management staff get the *Management* role.
4. Ask every crew member to open the app on their phone, log in, and tap **Turn on alerts**. On iPhone, they should first use *Share → Add to Home Screen* (iOS only allows web push for installed apps).
5. Change prices any time under **Fees**. New prices apply to the next payment; months already paid aren't affected.
6. If a member pays you in cash or by direct transfer, open their profile from **People** and use **Record cash payment**. It shows in their payment history and in your Payments totals, marked as cash.
7. For accounting, use **Payments → Export CSV**. The export follows whatever filters you've applied (e.g. one month, paid only).

**Who gets alerted:** all Management and Super admins, plus every crew member on a team that covers the member's zone. If no team covers a zone, every crew member is alerted so nothing is missed — the Teams & zones page flags uncovered zones in red.

---

## Updating an existing deployment

If you already deployed an earlier version against a database that has data in it, run `npm run db:migrate` once after pulling the new code. It adds any new columns; nothing is deleted. (A brand-new Neon database set up with `neon-setup.sql` is already up to date.)

## How payments work

- **Registration** (default ₦5,000) activates the home and covers the first month.
- **Monthly dues** (default ₦2,000) extend membership month by month; paying early adds to the current end date.
- After paying, Flutterwave sends the member back to `/api/payments/callback`, and also calls the webhook. Both **re-verify the transaction with Flutterwave's API** (status, amount, currency and reference must match) before anything is credited, and crediting is idempotent, so a payment can never be applied twice.
- A slow bank transfer shows as *Pending* with a **Check again** button.

---

## Local development

```bash
npm install
cp .env.example .env   # fill it in (a Supabase database works fine for local dev too)
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:3000
```

Useful scripts: `npm run typecheck`, `npm run build`, `npm run db:generate` (after editing `src/db/schema.ts`, creates a new migration in `/drizzle`), `npm run db:studio` (browse the database).

## Project layout

```
src/
  app/                 pages and API routes (App Router)
    api/               auth, profile, payments (initiate/callback/webhook/verify),
                       pickups, ops board, notifications, push, admin, cron
    dashboard/         member home with the Trash filled button and recent payments
    membership/        registration + monthly dues
    payments/          member payment history and printable receipts
    ops/               crew & management live board, request details, history
    admin/             super admin overview, payments (+ CSV export), people and member
                       profiles, teams & zones, fees
  components/          UI (BinScene animation, maps, shell, forms, admin tools)
  db/                  Drizzle schema and connection
  lib/                 auth, membership rules, Flutterwave, notifications, pickups
drizzle/               SQL migrations
scripts/               migrate and seed
public/                service worker, icon, web app manifest
vercel.json            daily cron schedule
```

## Notes

- Maps use OpenStreetMap through Leaflet — free, no API key. Directions open in Google Maps.
- Free-tier limits worth knowing: Vercel Hobby runs cron once a day (that's all this needs); Supabase free gives 500 MB, plenty for tens of thousands of members.
- Vercel's Hobby plan is meant for non-commercial use. When AreaCare starts taking real payments, move the project to Vercel Pro.
