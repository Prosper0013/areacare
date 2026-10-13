"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";

export function RecordPayment({
  userId,
  registered,
  fees,
}: {
  userId: string;
  registered: boolean;
  fees: { registrationFee: number; monthlyFee: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const type = registered ? "MONTHLY" : "REGISTRATION";
  const suggested = registered ? fees.monthlyFee * months : fees.registrationFee;
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/payments", {
        body: { userId, type, months, amount: Math.round(Number(amount || suggested)) },
      });
      toast.success("Payment recorded and membership extended");
      setOpen(false);
      setAmount("");
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
        <Plus size={15} /> Record cash payment
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
              aria-labelledby="record-title"
            >
              <div className="flex items-start justify-between">
                <h3 id="record-title" className="text-2xl font-bold">
                  Record a payment
                </h3>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-moss hover:bg-canvas" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <p className="mt-1 text-sm text-moss">
                For money received in cash or by direct transfer. The member's membership is extended and they get a receipt.
              </p>

              <p className="label mt-5">For</p>
              <p className="rounded-xl bg-canvas px-4 py-3 font-semibold">
                {registered ? "Monthly dues" : "Registration (includes the first month)"}
              </p>

              {registered && (
                <div className="mt-4">
                  <label htmlFor="rp-months" className="label">
                    Months
                  </label>
                  <select id="rp-months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="field">
                    {[1, 2, 3, 6, 12].map((m) => (
                      <option key={m} value={m}>
                        {m} month{m === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4">
                <label htmlFor="rp-amount" className="label">
                  Amount received
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center font-semibold text-moss">₦</span>
                  <input
                    id="rp-amount"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={amount}
                    placeholder={String(suggested)}
                    onChange={(e) => setAmount(e.target.value)}
                    className="field pl-9 font-display text-lg font-bold"
                  />
                </div>
                <p className="hint">Leave blank to use the current price, {naira(suggested)}.</p>
              </div>

              <button className="btn-primary mt-6 w-full py-3.5" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                Record {naira(Number(amount || suggested))}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
