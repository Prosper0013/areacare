"use client";

import { useEffect } from "react";

function chime() {
  try {
    const ctx = new AudioContext();
    [988, 1319, 988].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch {
    /* browsers block sound until the person has tapped the page once */
  }
}

/**
 * While `active`, buzzes the phone, plays a chime and flashes the tab title —
 * immediately, then every `everyMs` — until the member answers.
 * Push notifications cover the time the app is closed.
 */
export function useBuzz(active: boolean, everyMs = 45_000) {
  useEffect(() => {
    if (!active) return;
    const original = document.title;
    let flip = false;

    const buzz = () => {
      if (document.visibilityState !== "visible") return;
      try {
        navigator.vibrate?.([300, 120, 300, 120, 300]);
      } catch {
        /* not supported (e.g. iPhone) */
      }
      chime();
    };
    buzz();
    const t = setInterval(buzz, everyMs);
    const title = setInterval(() => {
      flip = !flip;
      document.title = flip ? "🔔 Confirm your pickup" : original;
    }, 1500);
    const onVisible = () => document.visibilityState === "visible" && buzz();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(t);
      clearInterval(title);
      document.removeEventListener("visibilitychange", onVisible);
      document.title = original;
    };
  }, [active, everyMs]);
}
