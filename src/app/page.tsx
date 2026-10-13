import Link from "next/link";
import { BellRing, MapPin, ShieldCheck, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { HeroDemo } from "@/components/HeroDemo";
import { getFees, type Fees } from "@/lib/settings";
import { naira } from "@/lib/format";
import { db } from "@/db";
import { zones } from "@/db/schema";

export const revalidate = 300;

async function loadPublicData(): Promise<{ fees: Fees; zoneNames: string[] }> {
  try {
    const [fees, zoneRows] = await Promise.all([getFees(), db.select({ name: zones.name }).from(zones)]);
    return { fees, zoneNames: zoneRows.map((z) => z.name) };
  } catch {
    return { fees: { registrationFee: 5000, monthlyFee: 2000 }, zoneNames: [] };
  }
}

const STEPS = [
  {
    title: "Create your account",
    body: "Sign up with your email and phone number, then add your house details and drop a pin on your gate.",
  },
  {
    title: "Register your home",
    body: "Pay the one-time registration fee through Flutterwave by card, bank transfer or USSD.",
  },
  {
    title: "Tap when the bin is full",
    body: "Press Trash filled. Your area crew and management get your address and live location at once.",
  },
];

export default async function Home() {
  const { fees, zoneNames } = await loadPublicData();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost btn-sm">
            Log in
          </Link>
          <Link href="/signup" className="btn-dark btn-sm">
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <div>
          <h1 className="text-[44px] font-extrabold leading-[0.98] text-forest-900 sm:text-6xl lg:text-[76px]">
            Bin full?
            <br />
            One tap, and the truck is on its way.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-moss">
            AreaCare collects household waste when you need it, not on a fixed day. Register your home once, and press
            a single button whenever your bin fills up.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3.5 text-base">
              Register your home
            </Link>
            <a href="#pricing" className="btn-outline px-6 py-3.5 text-base">
              See pricing
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-2 gap-6 border-t border-forest-900/10 pt-6">
            <div>
              <dt className="text-sm text-moss">Registration</dt>
              <dd className="font-display text-2xl font-bold">{naira(fees.registrationFee)}</dd>
            </div>
            <div>
              <dt className="text-sm text-moss">Then monthly</dt>
              <dd className="font-display text-2xl font-bold">{naira(fees.monthlyFee)}</dd>
            </div>
          </dl>
        </div>
        <HeroDemo />
      </section>

      {/* Hazard divider */}
      <div className="h-3 bg-hazard" aria-hidden />

      {/* How it works */}
      <section className="bg-forest-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">From full bin to empty bin in three steps</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="font-display text-[88px] font-extrabold leading-none text-vest-500/90">{i + 1}</span>
                <h3 className="mt-3 text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 max-w-sm leading-relaxed text-white/70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What crews receive */}
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-4xl font-bold leading-tight sm:text-5xl">Your crew knows exactly where to go</h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-moss">
            Every request carries your house number, street, landmark and the GPS position of your phone, so the team
            assigned to your area can find your gate without a single phone call.
          </p>
          <ul className="mt-8 space-y-5">
            {[
              [MapPin, "Live location", "Opens straight into Google Maps directions for the driver."],
              [BellRing, "Instant alerts", "Management and your area crew are notified on their phones together."],
              [Smartphone, "Progress you can see", "Watch your request move from received to on the way to collected."],
              [ShieldCheck, "Secure payments", "Card, transfer and USSD through Flutterwave. We never see your card."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof MapPin;
              return (
                <li key={title as string} className="flex gap-4">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-100 text-forest-600">
                    <I size={20} />
                  </span>
                  <div>
                    <p className="font-semibold">{title as string}</p>
                    <p className="text-moss">{body as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* A crew-side alert, rendered as the real thing looks */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="rounded-[32px] border-[10px] border-forest-900 bg-canvas p-4 shadow-lift">
            <div className="mb-3 flex items-center justify-between px-1 text-xs font-semibold text-moss">
              <span>9:41</span>
              <span>Crew board</span>
            </div>
            <div className="panel hazard-edge overflow-hidden p-4 pt-5">
              <div className="flex items-center justify-between">
                <span className="chip bg-ember-100 text-ember-600">Trash filled</span>
                <span className="text-xs text-moss">just now</span>
              </div>
              <p className="mt-3 font-display text-xl font-bold">Amaka Okafor</p>
              <p className="text-sm text-moss">Plot 14, 3rd Avenue, Gwarinpa Estate, Abuja</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Landmark:</span> opposite the blue water tank
              </p>
              <div className="mt-4 h-28 overflow-hidden rounded-xl bg-forest-100">
                <svg viewBox="0 0 300 112" className="h-full w-full" aria-hidden>
                  <path d="M0 70 C60 60 90 90 150 72 S240 30 300 44" stroke="#fff" strokeWidth="10" fill="none" />
                  <path d="M120 0 L135 112" stroke="#fff" strokeWidth="8" />
                  <path d="M0 22 H300" stroke="#fff" strokeWidth="5" opacity=".7" />
                  <circle cx="150" cy="70" r="16" fill="#F2B705" opacity=".35" />
                  <circle cx="150" cy="70" r="7" fill="#1F7A4D" stroke="#fff" strokeWidth="3" />
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <span className="btn-primary btn-sm">Start trip</span>
                <span className="btn-outline btn-sm">Call</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="text-4xl font-bold sm:text-5xl">Simple membership</h2>
          <p className="mt-3 max-w-xl text-lg text-moss">
            One registration fee to join, then a flat monthly fee. Request as many pickups as your home needs.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl bg-forest-900 p-8 text-white">
              <p className="text-white/70">Registration, one time</p>
              <p className="mt-2 font-display text-6xl font-extrabold">{naira(fees.registrationFee)}</p>
              <p className="mt-4 text-white/80">Activates your home and covers your first month of pickups.</p>
            </div>
            <div className="rounded-3xl border-2 border-forest-900/10 p-8">
              <p className="text-moss">Monthly dues</p>
              <p className="mt-2 font-display text-6xl font-extrabold">{naira(fees.monthlyFee)}</p>
              <p className="mt-4 text-moss">Pay month by month or several months ahead. Prices may change with notice.</p>
            </div>
          </div>
          <Link href="/signup" className="btn-vest mt-8 px-6 py-3.5 text-base">
            Create your account
          </Link>
        </div>
      </section>

      {zoneNames.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="text-2xl font-bold">Areas we cover</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {zoneNames.map((z) => (
              <li key={z} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-ring">
                {z}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-forest-900/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
          <Logo />
          <p className="text-sm text-moss">© {new Date().getFullYear()} AreaCare. Cleaner streets, one bin at a time.</p>
        </div>
      </footer>
    </div>
  );
}
