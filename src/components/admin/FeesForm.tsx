"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";

type Fees = { registrationFee: number; registrationCredit: number; binPrice: number; soakawayFee: number };

const FIELDS: { key: keyof Fees; label: string; hint: string; min: number }[] = [
  { key: "registrationFee", label: "Registration fee (one time)", hint: "What a new member pays to register their home.", min: 100 },
  { key: "registrationCredit", label: "Starting credit included", hint: "Part of the registration fee that goes straight into the member's pickup credit.", min: 0 },
  { key: "binPrice", label: "Price per trash can", hint: "Taken from credit for each filled trash can a member asks us to collect.", min: 50 },
  { key: "soakawayFee", label: "Soakaway evacuation", hint: "Price per evacuation. Applies to new bookings.", min: 100 },
];

export function FeesForm({ initial }: { initial: Fees }) {
  const [values, setValues] = useState<Record<keyof Fees, string>>({
    registrationFee: String(initial.registrationFee),
    registrationCredit: String(initial.registrationCredit),
    binPrice: String(initial.binPrice),
    soakawayFee: String(initial.soakawayFee),
  });
  const [busy, setBusy] = useState(false);
  const n = (k: keyof Fees) => Math.round(Number(values[k]) || 0);
  const cansFromStart = n("binPrice") > 0 ? Math.floor(n("registrationCredit") / n("binPrice")) : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: Object.fromEntries(FIELDS.map((f) => [f.key, n(f.key)])),
      });
      toast.success("Prices updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="panel space-y-6 p-6 sm:p-8">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="label">
              {f.label}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center font-semibold text-moss">₦</span>
              <input
                id={f.key}
                type="number"
                inputMode="numeric"
                min={f.min}
                step={50}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="field pl-9 font-display text-xl font-bold"
                required
              />
            </div>
            <p className="hint">{f.hint}</p>
          </div>
        ))}
        <button className="btn-primary" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          Save prices
        </button>
      </div>

      <aside className="h-fit rounded-2xl bg-forest-900 p-6 text-white lg:sticky lg:top-24">
        <p className="text-sm text-white/70">What a new member sees</p>
        <p className="mt-3 font-display text-4xl font-extrabold">{naira(n("registrationFee"))}</p>
        <p className="text-white/80">to register</p>
        <ul className="mt-5 space-y-2 text-sm">
          <li className="flex justify-between gap-3 border-b border-white/10 pb-2">
            <span className="text-white/70">Starting credit</span>
            <span className="font-semibold">{naira(n("registrationCredit"))}</span>
          </li>
          <li className="flex justify-between gap-3 border-b border-white/10 pb-2">
            <span className="text-white/70">Each trash can</span>
            <span className="font-semibold">{naira(n("binPrice"))}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-white/70">Cans covered at sign-up</span>
            <span className="font-semibold">{cansFromStart}</span>
          </li>
        </ul>
        {n("registrationCredit") > n("registrationFee") && (
          <p className="mt-4 rounded-lg bg-ember-100 px-3 py-2 text-sm text-ember-600">Starting credit can&apos;t be more than the registration fee.</p>
        )}
      </aside>
    </form>
  );
}
