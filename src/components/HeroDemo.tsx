"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BinScene } from "./BinScene";

type Phase = "idle" | "sent" | "arriving" | "collected";

/** Landing-page hero: the visitor can press the same button members use. */
export function HeroDemo() {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase === "sent") {
      const t = setTimeout(() => setPhase("arriving"), 900);
      return () => clearTimeout(t);
    }
    if (phase === "arriving") {
      const t = setTimeout(() => setPhase("collected"), 2200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const level = phase === "collected" ? 0.08 : 0.9;
  const caption: Record<Phase, string> = {
    idle: "Bin at 90%. Try the button.",
    sent: "Request sent to your area crew…",
    arriving: "Crew on the way to Plot 14, Gwarinpa",
    collected: "Collected. Bin emptied.",
  };

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[28px] bg-forest-50 p-6 pt-10 shadow-ring sm:p-10">
        <BinScene level={level} lidOpen={phase === "idle" || phase === "sent"} truck={phase === "arriving" || phase === "collected"} />

        <div className="mt-4 flex flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-medium text-moss"
              aria-live="polite"
            >
              {caption[phase]}
            </motion.p>
          </AnimatePresence>

          {phase === "idle" || phase === "sent" ? (
            <button
              type="button"
              onClick={() => setPhase("sent")}
              disabled={phase !== "idle"}
              className="relative rounded-full bg-vest-500 px-7 py-3.5 font-display text-lg font-bold text-forest-900 shadow-lift transition hover:bg-vest-400 active:scale-95"
            >
              <span className="absolute inset-0 -z-10 rounded-full bg-vest-500 animate-pulse-ring" aria-hidden />
              Trash filled
            </button>
          ) : (
            <button type="button" onClick={() => setPhase("idle")} className="btn-outline btn-sm">
              Fill it up again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
