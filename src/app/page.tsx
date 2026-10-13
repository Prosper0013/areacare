import Link from "next/link";
import { BellRing, MapPin, PiggyBank, ShieldCheck, Smartphone, Trash2, Wallet } from "lucide-react";
import { Logo } from "@/components/Logo";
import { HeroDemo } from "@/components/HeroDemo";
import { DEFAULT_FEES, getFees, type Fees } from "@/lib/settings";
import { PriceCalculator } from "@/components/PriceCalculator";
import { naira } from "@/lib/format";
import { db } from "@/db";
import { zones } from "@/db/schema";

export const revalidate = 300;

async function loadPublicData(): Promise<{ fees: Fees; zoneNames: string[] }> {
  try {
    const [fees, zoneRows] = await Promise.all([getFees(), db.select({ name: zones.name }).from(zones)]);
    return { fees, zoneNames: zoneRows.map((z) => z.name) };
  } catch {
    return { fees: DEFAULT_FEES, zoneNames: [] };
  }
}

const steps = (f: Fees) => [
  {
    title: "Create your account",
    body: "Sign up with your email and phone number. Tap “use my location” and your address fills itself in.",
  },
  {
    title: "Register your home",
    body: `Pay ${naira(f.registrationFee)} once by card, transfer or USSD. ${naira(f.registrationCredit)} of it lands in your pickup credit straight away.`,
  },
  {
    title: "Tap, and pay per can",
    body: `Press Trash filled and say how many cans are full. ${naira(f.binPrice)} each comes off your credit — top up whenever you like.`,
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
            AreaCare collects household waste when you need it, not on a fixed day. No monthly fees — you only pay for the
            trash cans we actually empty.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3.5 text-base">
              Register your home
            </Link>
            <a href="#pricing" className="btn-outline px-6 py-3.5 text-base">
              See pricing
            </a>
            <a href="#soakaway" className="btn-ghost px-4 py-3.5 text-base underline-offset-4 hover:underline">
              Soakaway evacuation
            </a>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-forest-900/10 pt-6 sm:gap-6">
            <div>
              <dt className="text-sm text-moss">Registration</dt>
              <dd className="font-display text-xl font-bold sm:text-2xl">{naira(fees.registrationFee)}</dd>
            </div>
            <div>
              <dt className="text-sm text-moss">Credit included</dt>
              <dd className="font-display text-xl font-bold sm:text-2xl">{naira(fees.registrationCredit)}</dd>
            </div>
            <div>
              <dt className="text-sm text-moss">Per trash can</dt>
              <dd className="font-display text-xl font-bold sm:text-2xl">{naira(fees.binPrice)}</dd>
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
            {steps(fees).map((s, i) => (
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
              [Trash2, "Exactly how many cans", "The crew sees how many trash cans to bring the truck for."],
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
                <span className="chip bg-ember-100 text-ember-600">Trash filled · 3 cans</span>
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
          <p className="chip bg-vest-100 text-forest-900">No monthly fees</p>
          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">Pay as you go</h2>
          <p className="mt-3 max-w-xl text-lg text-moss">
            Register once, then pay only for the trash cans we collect. Quiet month? You pay nothing.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl bg-forest-900 p-8 text-white">
              <p className="text-white/70">Registration, one time</p>
              <p className="mt-2 font-display text-6xl font-extrabold">{naira(fees.registrationFee)}</p>
              <p className="mt-4 text-white/80">
                Puts your home on your area crew&apos;s route. Includes{" "}
                <span className="font-semibold text-vest-400">{naira(fees.registrationCredit)} pickup credit</span> — that&apos;s{" "}
                {Math.floor(fees.registrationCredit / Math.max(1, fees.binPrice))} cans already paid for.
              </p>
            </div>
            <div className="rounded-3xl border-2 border-forest-900/10 p-8">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-vest-500 text-forest-900">
                <Trash2 size={22} />
              </span>
              <p className="mt-4 text-moss">Per filled trash can</p>
              <p className="mt-1 font-display text-6xl font-extrabold">{naira(fees.binPrice)}</p>
              <p className="mt-4 text-moss">Taken from your credit when you press Trash filled. Cancel before we come and it&apos;s refunded.</p>
            </div>
            <div className="rounded-3xl border-2 border-forest-900/10 p-8">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-100 text-forest-600">
                <Wallet size={22} />
              </span>
              <p className="mt-4 text-moss">Top up</p>
              <p className="mt-1 font-display text-5xl font-extrabold leading-[1.1]">Any amount</p>
              <p className="mt-4 flex gap-2 text-moss">
                <PiggyBank size={20} className="mt-0.5 shrink-0 text-forest-600" />
                Add credit by card, transfer or USSD whenever it runs low. It never expires.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <PriceCalculator binPrice={fees.binPrice} startCredit={fees.registrationCredit} />
          </div>
          <Link href="/signup" className="btn-vest mt-8 px-6 py-3.5 text-base">
            Create your account
          </Link>
        </div>
      </section>

      {/* Soakaway evacuation */}
      <section id="soakaway" className="bg-forest-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-4xl font-bold leading-tight sm:text-5xl">Soakaway full? Book an evacuation truck.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
              Book online, pay securely, and AreaCare confirms the exact date and time. You get a reminder on the morning
              of the visit and a message when it&apos;s done.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/soakaway" className="btn-vest px-6 py-3.5 text-base">
                Book an evacuation
              </Link>
              <p className="text-white/70">
                <span className="font-display text-3xl font-extrabold text-white">{naira(fees.soakawayFee)}</span> per evacuation
              </p>
            </div>
          </div>
          <ol className="grid gap-3">
            {[
              ["Book and pay", "Pick a preferred day and pay with card, transfer or USSD."],
              ["We approve and schedule", "AreaCare sets the date and time and notifies you straight away."],
              ["We evacuate", "Our truck empties your soakaway. You're told when it's done."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-2xl bg-white/5 p-5">
                <span className="font-display text-4xl font-extrabold leading-none text-vest-500">{i + 1}</span>
                <div>
                  <p className="text-lg font-semibold">{t}</p>
                  <p className="text-white/70">{d}</p>
                </div>
              </li>
            ))}
          </ol>
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
