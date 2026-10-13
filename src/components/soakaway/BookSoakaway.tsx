"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";
import { TIME_LABEL } from "./SoakawayStatus";

function todayInLagos() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

export function BookSoakaway({ fee }: { fee: number }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState<"morning" | "afternoon" | "any">("any");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { link } = await api<{ link: string }>("/api/soakaway", {
        body: { preferredDate: date || null, preferredTime: time, note: note || null },
      });
      window.location.href = link;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={book} className="space-y-5">
      <div>
        <label htmlFor="pref-date" className="label">
          Preferred date <span className="font-normal text-moss">(optional)</span>
        </label>
        <input id="pref-date" type="date" min={todayInLagos()} value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        <p className="hint">AreaCare confirms the exact date and time when they approve your booking.</p>
      </div>
      <div>
        <p className="label">Preferred time</p>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
          {(["morning", "afternoon", "any"] as const).map((t) => (
            <button
              type="button"
              key={t}
              role="radio"
              aria-checked={time === t}
              onClick={() => setTime(t)}
              className={clsx(
                "rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition",
                time === t ? "border-forest-600 bg-forest-50" : "border-forest-900/10 hover:border-forest-900/25",
              )}
            >
              {TIME_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="soak-note" className="label">
          Anything the team should know? <span className="font-normal text-moss">(optional)</span>
        </label>
        <textarea
          id="soak-note"
          rows={3}
          maxLength={400}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="field resize-none"
          placeholder="Soakaway is behind the house; the gate is narrow for big trucks."
        />
      </div>
      <button className="btn-vest w-full py-4 text-base" disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
        {busy ? "Opening secure checkout…" : `Book and pay ${naira(fee)}`}
      </button>
      <p className="text-center text-xs text-moss">Card, bank transfer or USSD through Flutterwave.</p>
    </form>
  );
}
