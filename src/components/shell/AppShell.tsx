import { LogOut } from "lucide-react";
import type { User } from "@/db/schema";
import { Logo } from "../Logo";
import { NavLinks } from "./NavLinks";
import { NotificationBell } from "./NotificationBell";
import { ConfirmBarGate } from "../confirm/ConfirmBarGate";
import { db } from "@/db";
import { pickups } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

const ROLE_LABEL = { USER: "Member", STAFF: "Crew", ADMIN: "Management", SUPER_ADMIN: "Super admin" } as const;

export async function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  // Members with a bin reported cleared see a confirm prompt on every page until they answer.
  const awaiting =
    user.role === "USER"
      ? await db.query.pickups.findFirst({
          where: and(eq(pickups.userId, user.id), eq(pickups.status, "AWAITING_CONFIRMATION")),
          orderBy: desc(pickups.clearedAt),
          columns: { id: true, clearedAt: true, clearedNote: true },
        })
      : null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-forest-900 p-5 lg:flex">
        <Logo href="/" light />
        <div className="mt-10 flex-1">
          <NavLinks role={user.role} variant="side" />
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-600 font-bold text-white">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-white/60">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post" className="mt-3">
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">
              <LogOut size={16} /> Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {awaiting && <ConfirmBarGate pickup={awaiting} />}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-canvas/85 px-5 py-4 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <Logo href="/" />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <NotificationBell pollMs={user.role === "USER" ? 20000 : 10000} />
            <form action="/api/auth/logout" method="post" className="lg:hidden">
              <button className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-ring" aria-label="Log out">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 pb-28 pt-2 sm:px-8 lg:pb-12">{children}</main>
      </div>

      <NavLinks role={user.role} variant="bottom" />
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-bold leading-tight sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-moss">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
