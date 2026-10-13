"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";

/** Records cash / direct-transfer money: registration for new members, credit top-up after that. */
export function RecordPayment({
  userId,
  registered,
  fees,
}: {
  userId: string;
  registered: boolean;
  fees: { registrationFee: number; registrationCredit: number; binPrice: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const type = registered ? "TOPUP" : "REGISTRATION";
  const suggested = registered ? fees.binPrice * 4 : fees.registrationFee;
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const value = Math.round(Number(amount || suggested));
  const credit = registered
    ? value
    : Math.max(0, Math.min(fees.registrationCredit, value)) + Math.max(0, value - fees.registrationFee);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/payments", { body: { userId, type, amount: value } });
      toast.success(registered ? `${naira(value)} added to their credit` : "Registration recorded");
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
              <p className="mt-1 text-sm text-moss">For money received in cash or by direct transfer. The member gets a receipt.</p>

              <p className="label mt-5">For</p>
              <p className="rounded-xl bg-canvas px-4 py-3 font-semibold">
                {registered ? "Credit top-up" : `Registration (includes ${naira(fees.registrationCredit)} credit)`}
              </p>

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
                    min={1}
                    value={amount}
                    placeholder={String(suggested)}
                    onChange={(e) => setAmount(e.target.value)}
                    className="field pl-9 font-display text-lg font-bold"
                  />
                </div>
                <p className="hint">
                  {registered ? "The full amount is added to their credit." : `Leave blank for the current fee, ${naira(fees.registrationFee)}.`}
                </p>
              </div>

              <div className="mt-4 flex justify-between rounded-xl border border-forest-900/10 px-4 py-3 text-sm">
                <span className="text-moss">Credit they&apos;ll receive</span>
                <span className="font-semibold">{naira(credit)}</span>
              </div>

              <button className="btn-primary mt-6 w-full py-3.5" disabled={busy || !(value > 0)}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                Record {naira(value || 0)}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
