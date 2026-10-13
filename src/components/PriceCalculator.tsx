"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { naira } from "@/lib/format";

/** "How much will I spend?" — drag to the number of cans a month and see the cost. */
export function PriceCalculator({ binPrice, startCredit }: { binPrice: number; startCredit: number }) {
  const [cans, setCans] = useState(6);
  const monthly = cans * binPrice;
  const startCans = binPrice > 0 ? Math.floor(startCredit / binPrice) : 0;

  return (
    <div className="rounded-3xl bg-canvas p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-moss">Trash cans you fill in a month</p>
          <motion.p key={cans} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-5xl font-extrabold">
            {cans}
          </motion.p>
        </div>
        <div className="text-right">
          <p className="text-moss">You&apos;d spend about</p>
          <motion.p key={monthly} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-5xl font-extrabold text-forest-600">
            {naira(monthly)}
          </motion.p>
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={30}
        value={cans}
        onChange={(e) => setCans(Number(e.target.value))}
        aria-label="Trash cans per month"
        className="mt-6 w-full accent-forest-600"
      />

      <div className="mt-5 flex min-h-[64px] flex-wrap content-start gap-1.5" aria-hidden>
        <AnimatePresence initial={false}>
          {Array.from({ length: cans }, (_, i) => (
            <motion.span
              key={i}
              initial={{ y: 12, scale: 0.4, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className={i < startCans ? "text-vest-600" : "text-forest-600"}
            >
              <Trash2 size={24} />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-sm text-moss">
        <span className="rounded bg-vest-500 px-1.5 font-semibold text-forest-900">Yellow cans</span> are already paid for by the {naira(startCredit)} credit in your
        registration. No collections in a month? You pay nothing.
      </p>
    </div>
  );
}
