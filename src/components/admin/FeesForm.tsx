"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";

export function FeesForm({ initial }: { initial: { registrationFee: number; monthlyFee: number; soakawayFee: number } }) {
  const [reg, setReg] = useState(String(initial.registrationFee));
  const [monthly, setMonthly] = useState(String(initial.monthlyFee));
  const [soak, setSoak] = useState(String(initial.soakawayFee));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: {
          registrationFee: Math.round(Number(reg)),
          monthlyFee: Math.round(Number(monthly)),
          soakawayFee: Math.round(Number(soak)),
        },
      });
      toast.success("Prices updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="panel max-w-xl space-y-6 p-6 sm:p-8">
      {[
        ["registrationFee", "Registration fee (one time)", reg, setReg, "Activates a home and covers the month they join."],
        ["monthlyFee", "Monthly dues", monthly, setMonthly, "Charged per calendar month of membership."],
        ["soakawayFee", "Soakaway evacuation", soak, setSoak, "Price per evacuation. Applies to new bookings."],
      ].map(([id, label, value, set, hint]) => (
        <div key={id as string}>
          <label htmlFor={id as string} className="label">
            {label as string}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center font-semibold text-moss">₦</span>
            <input
              id={id as string}
              type="number"
              inputMode="numeric"
              min={100}
              step={50}
              value={value as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value)}
              className="field pl-9 font-display text-xl font-bold"
              required
            />
          </div>
          <p className="hint">{hint as string}</p>
        </div>
      ))}
      <button className="btn-primary" disabled={busy}>
        {busy && <Loader2 size={16} className="animate-spin" />}
        Save fees
      </button>
    </form>
  );
}
