"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/client";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unsupported" | "off" | "on" | "blocked" | "loading";

/** Lets a person receive alerts on this phone/computer even when AreaCare is closed. */
export function PushToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      if (!PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!) }));
      await api("/api/push", { body: sub.toJSON() });
      setState("on");
      toast.success("Alerts turned on for this device");
    } catch (err) {
      setState("off");
      toast.error((err as Error).message);
    }
  }

  if (state === "unsupported" || state === "on") return null;

  return (
    <div className={clsx("flex items-center gap-3 rounded-xl bg-vest-100 p-3", className)}>
      <BellRing size={20} className="shrink-0 text-forest-900" />
      <p className="flex-1 text-sm text-forest-900">
        {state === "blocked"
          ? "Alerts are blocked in your browser settings for this site."
          : compact
            ? "Get alerts on this device."
            : "Turn on alerts so this device rings when there's an update, even with the app closed."}
      </p>
      {state !== "blocked" && (
        <button onClick={enable} className="btn-dark btn-sm shrink-0" disabled={state === "loading"}>
          {state === "loading" && <Loader2 size={14} className="animate-spin" />}
          Turn on
        </button>
      )}
    </div>
  );
}
