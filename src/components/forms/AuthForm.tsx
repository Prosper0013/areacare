"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      const res = await api<{ redirect: string }>(`/api/auth/${mode}`, {
        body: mode === "login" ? { ...form, next: params.get("next") ?? undefined } : form,
      });
      router.replace(res.redirect);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {mode === "signup" && (
        <>
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" name="name" autoComplete="name" required className="field" placeholder="Amaka Okafor" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              className="field"
              placeholder="0803 123 4567"
            />
            <p className="hint">Crews call this number if they can't find your gate.</p>
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder="you@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            className="field pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-moss hover:text-forest-900"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {mode === "signup" && <p className="hint">At least 8 characters.</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-ember-100 px-4 py-3 text-sm font-medium text-ember-600">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base">
        {busy && <Loader2 size={18} className="animate-spin" />}
        {mode === "login" ? "Log in" : "Create account"}
      </button>

      <p className="text-center text-sm text-moss">
        {mode === "login" ? (
          <>
            New to AreaCare?{" "}
            <Link href="/signup" className="font-semibold text-forest-600 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-forest-600 hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
