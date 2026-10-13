"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { useBuzz } from "./useBuzz";

export type AwaitingPickup = {
  id: string;
  clearedAt: string | Date | null;
  clearedNote: string | null;
};

/**
 * "Has your bin been cleared?" — shown to the member until they answer.
 *  variant "card": the big prompt on the home dashboard
 *  variant "bar":  a sticky strip at the top of every other page
 */
export function ConfirmClearance({
  pickup,
  variant,
  startWithNo = false,
  onDone,
}: {
  pickup: AwaitingPickup;
  variant: "card" | "bar";
  startWithNo?: boolean;
  onDone?: (cleared: boolean) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"ask" | "no">(startWithNo ? "no" : "ask");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [answered, setAnswered] = useState(false);
  useBuzz(!answered);

  async function answer(cleared: boolean) {
    setBusy(cleared ? "yes" : "no");
    try {
      await api(`/api/pickups/${pickup.id}/confirm`, { body: { cleared, note: cleared ? null : note || null } });
      setAnswered(true);
      toast.success(cleared ? "Thanks! Pickup confirmed as cleared." : "Sorry about that. We've sent the crew back.");
      onDone?.(cleared);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (answered) return null;
  const when = pickup.clearedAt ? timeAgo(pickup.clearedAt) : "just now";

  if (variant === "bar") {
    return (
      <div role="alertdialog" aria-labelledby="confirm-bar-title" className="relative z-30 bg-vest-500 text-forest-900 shadow-lift">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3 sm:px-8">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest-900 text-vest-500">
            <span className="absolute inset-0 rounded-full bg-forest-900 animate-pulse-ring" aria-hidden />
            <Check size={18} strokeWidth={3} className="relative" />
          </span>
          <p id="confirm-bar-title" className="min-w-0 flex-1 text-sm font-semibold sm:text-base">
            The crew reported your bin cleared {when}. Is it?
          </p>
          <div className="flex gap-2">
            <button onClick={() => answer(true)} disabled={!!busy} className="btn-dark btn-sm">
              {busy === "yes" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Yes, cleared
            </button>
            <a href="/dashboard?confirm=no" className="btn btn-sm bg-white/60 text-forest-900 hover:bg-white">
              Not cleared
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      role="alertdialog"
      aria-labelledby="confirm-card-title"
      className="hazard-edge relative overflow-hidden rounded-[28px] bg-white p-6 pt-9 shadow-lift sm:p-8 sm:pt-10"
    >
      <div className="flex flex-wrap items-start gap-5">
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-vest-500 text-forest-900">
          <span className="absolute inset-0 rounded-2xl bg-vest-500 animate-pulse-ring" aria-hidden />
          <Check size={28} strokeWidth={3} className="relative" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="confirm-card-title" className="text-2xl font-bold sm:text-3xl">
            Has your bin been cleared?
          </h2>
          <p className="mt-1 text-moss">
            The crew reported it cleared {when}. Please check and confirm so we can close this pickup.
          </p>
          {pickup.clearedNote && (
            <p className="mt-3 rounded-xl bg-canvas px-4 py-2.5 text-sm">
              <span className="font-semibold">Crew note:</span> “{pickup.clearedNote}”
            </p>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "ask" ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 grid gap-3 sm:grid-cols-2"
          >
            <button onClick={() => answer(true)} disabled={!!busy} className="btn-primary py-4 text-base">
              {busy === "yes" ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
              Yes, it's cleared
            </button>
            <button onClick={() => setMode("no")} disabled={!!busy} className="btn-outline py-4 text-base">
              <X size={18} /> No, it's still full
            </button>
          </motion.div>
        ) : (
          <motion.div key="no" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} className="mt-6">
            <label htmlFor="reopen-note" className="label">
              What's wrong? <span className="font-normal text-moss">(optional)</span>
            </label>
            <textarea
              id="reopen-note"
              rows={2}
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="field resize-none"
              placeholder="The bin is still full / they took only one bag"
              autoFocus
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button onClick={() => answer(false)} disabled={!!busy} className={clsx("btn py-4 text-base", "bg-ember-600 text-white hover:bg-ember-600/90")}>
                {busy === "no" && <Loader2 size={18} className="animate-spin" />}
                Send the crew back
              </button>
              <button onClick={() => setMode("ask")} disabled={!!busy} className="btn-ghost py-4 text-base">
                Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
