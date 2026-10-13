"use client";

import { useState } from "react";
import clsx from "clsx";
import { naira } from "@/lib/format";
import { PayButton } from "./PayButton";

const OPTIONS = [1, 3, 6, 12];

export function MonthlyPay({ monthlyFee }: { monthlyFee: number }) {
  const [months, setMonths] = useState(1);
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
      <div className="mt-5 flex items-center justify-between border-t border-forest-900/10 pt-4">
        <span className="text-moss">Total</span>
        <span className="font-display text-3xl font-bold">{naira(monthlyFee * months)}</span>
      </div>
      <PayButton type="MONTHLY" months={months} label={`Pay ${naira(monthlyFee * months)}`} className="mt-4 w-full py-3.5" />
    </div>
  );
}
