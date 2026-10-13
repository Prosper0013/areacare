"use client";

import { useState } from "react";
import clsx from "clsx";
import { naira } from "@/lib/format";
import { coverageFor, periodLabel } from "@/lib/billing";
import { PayButton } from "./PayButton";

const OPTIONS = [1, 3, 6, 12];

export function MonthlyPay({ monthlyFee, paidThrough }: { monthlyFee: number; paidThrough: string | null }) {
  const [months, setMonths] = useState(1);
  const through = paidThrough ? new Date(paidThrough) : null;
  const cover = coverageFor(through, months);

  return (
    <div>
      <p className="label">How many months?</p>
      <div role="radiogroup" className="grid grid-cols-4 gap-2">
        {OPTIONS.map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={months === m}
            onClick={() => setMonths(m)}
            className={clsx(
              "rounded-xl border-2 py-3 text-center transition",
              months === m ? "border-forest-600 bg-forest-50" : "border-forest-900/10 hover:border-forest-900/25",
            )}
          >
            <span className="block font-display text-xl font-bold">{m}</span>
            <span className="text-xs text-moss">{m === 1 ? "month" : "months"}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-2 border-t border-forest-900/10 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-moss">Covers</span>
          <span className="font-semibold">{periodLabel(cover.start, cover.end)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-moss">Total</span>
          <span className="font-display text-3xl font-bold">{naira(monthlyFee * months)}</span>
        </div>
      </div>
      <PayButton type="MONTHLY" months={months} label={`Pay ${naira(monthlyFee * months)}`} className="mt-4 w-full py-3.5" />
    </div>
  );
}
