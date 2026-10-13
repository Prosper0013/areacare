"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";

/** Super admin adds or removes credit without a payment (goodwill, corrections, extra cans found). */
export function AdjustCredit({ userId, balance }: { userId: string; balance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const value = Math.round(Number(amount) || 0);
  const after = balance + (mode === "add" ? value : -value);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/admin/users/${userId}/credit`, { body: { amount: mode === "add" ? value : -value, reason } });
      toast.success(`Credit is now ${naira(after)}`);
      setOpen(false);
      setAmount("");
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline btn-sm">
        <SlidersHorizontal size={15} /> Adjust credit
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/50 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && setOpen(false)}
          >
            <motion.form
              onSubmit={save}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="adjust-title"
            >
              <div className="flex items-start justify-between">
                <h3 id="adjust-title" className="text-2xl font-bold">
                  Adjust credit
                </h3>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-moss hover:bg-canvas" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <p className="mt-1 text-sm text-moss">No money changes hands. The member is notified with your reason.</p>

              <div role="radiogroup" className="mt-5 grid grid-cols-2 gap-2">
                {(["add", "remove"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={clsx(
                      "rounded-xl border-2 py-2.5 font-semibold transition",
                      mode === m ? "border-forest-600 bg-forest-50" : "border-forest-900/10 hover:border-forest-900/25",
                    )}
                  >
                    {m === "add" ? "Add credit" : "Remove credit"}
                  </button>
                ))}
              </div>

              <label htmlFor="adj-amount" className="label mt-4">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center font-semibold text-moss">₦</span>
                <input
                  id="adj-amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="field pl-9 font-display text-lg font-bold"
                  required
                />
              </div>

              <label htmlFor="adj-reason" className="label mt-4">
                Reason
              </label>
              <input
                id="adj-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder={mode === "add" ? "Goodwill — missed pickup on 12 Oct" : "2 extra cans collected on 12 Oct"}
                className="field"
                required
              />

              <div className="mt-4 flex justify-between rounded-xl border border-forest-900/10 px-4 py-3 text-sm">
                <span className="text-moss">Balance after</span>
                <span className={clsx("font-semibold", after < 0 && "text-ember-600")}>{after < 0 ? "Can't go below ₦0" : naira(after)}</span>
              </div>

              <button className="btn-primary mt-6 w-full py-3.5" disabled={busy || value <= 0 || after < 0 || reason.trim().length < 3}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                {mode === "add" ? `Add ${naira(value)}` : `Remove ${naira(value)}`}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
