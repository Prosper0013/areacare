"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, CreditCard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { PushToggle } from "./PushToggle";

type Item = { id: string; title: string; body: string; link: string | null; kind: string; read: boolean; createdAt: string };

function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1175].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.16);
      o.stop(ctx.currentTime + i * 0.16 + 0.32);
    });
  } catch {
    /* audio not allowed yet */
  }
}

/** Polls for new notifications; toasts and chimes when something new arrives. */
export function NotificationBell({ pollMs = 15000 }: { pollMs?: number }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Item[]; unread: number }>("/api/notifications");
      if (seen.current) {
        const fresh = data.items.filter((n) => !n.read && !seen.current!.has(n.id));
        if (fresh.length) {
          chime();
          fresh.slice(0, 3).forEach((n) =>
            toast(n.title, {
              description: n.body.split("\n")[0],
              action: n.link ? { label: "Open", onClick: () => router.push(n.link!) } : undefined,
            }),
          );
          router.refresh();
        }
      }
      seen.current = new Set(data.items.map((n) => n.id));
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* offline — try again next tick */
    }
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), pollMs);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, pollMs]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !panelRef.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function markAll() {
    await api("/api/notifications", { body: {} });
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-11 w-11 place-items-center rounded-xl bg-white shadow-ring transition hover:bg-forest-50"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember-600 px-1 text-[11px] font-bold text-white"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-40 mt-2 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-forest-900/5"
          >
            <div className="flex items-center justify-between border-b border-forest-900/5 px-4 py-3">
              <p className="font-display text-lg font-bold">Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
                  <CheckCheck size={16} /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-moss">Nothing yet. Updates about pickups and payments land here.</li>
              )}
              {items.map((n) => {
                const Icon = n.kind === "payment" ? CreditCard : Trash2;
                const body = (
                  <div className={clsx("flex gap-3 px-4 py-3 transition hover:bg-forest-50", !n.read && "bg-vest-100/40")}>
                    <span
                      className={clsx(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        n.kind === "payment" ? "bg-forest-100 text-forest-600" : "bg-vest-100 text-forest-900",
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="line-clamp-2 whitespace-pre-line text-sm text-moss">{n.body}</p>
                      <p className="mt-1 text-xs text-moss/80">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-forest-900/5 p-3">
              <PushToggle compact />
              <Link href="/notifications" onClick={() => setOpen(false)} className="btn-ghost btn-sm mt-1 w-full">
                See all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
