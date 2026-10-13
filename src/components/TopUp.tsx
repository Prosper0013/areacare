"use client";

import { useState } from "react";
import clsx from "clsx";
import { binsLabel, naira } from "@/lib/format";
import { PayButton } from "./PayButton";

/** Pick a top-up amount (shown as trash cans) and go to Flutterwave. */
export function TopUp({ binPrice, balance, max }: { binPrice: number; balance: number; max: number }) {
  const presets = [2, 4, 10, 20].map((n) => n * binPrice).filter((a) => a <= max);
  const [amount, setAmount] = useState(presets[1] ?? presets[0] ?? binPrice);
  const [custom, setCustom] = useState("");
  const value = custom ? Math.round(Number(custom)) : amount;
  const valid = Number.isFinite(value) && value >= binPrice && value <= max;
  const cans = binPrice > 0 ? Math.floor((balance + (valid ? value : 0)) / binPrice) : 0;

  return (
    <div>
      <p className="label">How much?</p>
      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {presets.map((a) => {
          const on = !custom && amount === a;
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setAmount(a);
                setCustom("");
              }}
              className={clsx(
                "rounded-xl border-2 px-2 py-3 text-center transition",
                on ? "border-forest-600 bg-forest-50" : "border-forest-900/10 hover:border-forest-900/25",
              )}
            >
              <span className="block font-display text-xl font-bold">{naira(a)}</span>
              <span className="text-xs text-moss">{binsLabel(Math.round(a / binPrice))}</span>
            </button>
          );
        })}
      </div>
      <label htmlFor="topup-custom" className="label mt-4">
        Or enter an amount
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center font-semibold text-moss">₦</span>
        <input
          id="topup-custom"
          type="number"
          inputMode="numeric"
          min={binPrice}
          max={max}
          step={50}
          value={custom}
          placeholder={String(amount)}
          onChange={(e) => setCustom(e.target.value)}
          className="field pl-9 font-display text-lg font-bold"
        />
      </div>
      {custom && !valid && (
        <p className="mt-1.5 text-sm text-ember-600">
          Enter between {naira(binPrice)} and {naira(max)}.
        </p>
      )}
      <div className="mt-5 space-y-2 border-t border-forest-900/10 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-moss">Credit after top-up</span>
          <span className="font-semibold">{naira(balance + (valid ? value : 0))}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-moss">Enough for</span>
          <span className="font-display text-2xl font-bold">{binsLabel(cans)}</span>
        </div>
      </div>
      <PayButton
        type="TOPUP"
        amount={valid ? value : undefined}
        label={valid ? `Top up ${naira(value)}` : "Top up"}
        className="mt-4 w-full py-3.5"
      />
      <p className="mt-3 text-center text-xs text-moss">Card, bank transfer or USSD. Secured by Flutterwave. Credit never expires.</p>
    </div>
  );
}
