"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  ClipboardList,
  CreditCard,
  Gauge,
  Home,
  Map,
  Settings2,
  Truck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/db/schema";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export function navFor(role: Role): Item[] {
  if (role === "USER")
    return [
      { href: "/dashboard", label: "Home", icon: Home, exact: true },
      { href: "/dashboard/history", label: "Pickups", icon: ClipboardList },
      { href: "/soakaway", label: "Soakaway", icon: Truck },
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/membership", label: "Membership", icon: BadgeCheck },
      { href: "/notifications", label: "Alerts", icon: Bell },
    ];
  const ops: Item[] = [
    { href: "/ops", label: "Live board", icon: Map, exact: true },
    { href: "/ops/history", label: "History", icon: ClipboardList },
  ];
  if (role === "SUPER_ADMIN")
    return [
      { href: "/admin", label: "Overview", icon: Gauge, exact: true },
      ...ops,
      { href: "/ops/soakaway", label: "Soakaway", icon: Truck },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/users", label: "People", icon: Users },
      { href: "/admin/teams", label: "Teams & areas", icon: UsersRound },
      { href: "/admin/settings", label: "Prices", icon: Settings2 },
    ];
  if (role === "ADMIN") return [...ops, { href: "/ops/soakaway", label: "Soakaway", icon: Truck }, { href: "/notifications", label: "Alerts", icon: Bell }];
  return [...ops, { href: "/notifications", label: "Alerts", icon: Bell }];
}

export function NavLinks({ role, variant }: { role: Role; variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const items = navFor(role);
  const isActive = (i: Item) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));

  if (variant === "bottom") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-forest-900/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-lg justify-around">
          {items.slice(0, 5).map((i) => {
            const active = isActive(i);
            return (
              <li key={i.href} className="flex-1">
                <Link
                  href={i.href}
                  className={clsx(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                    active ? "text-forest-600" : "text-moss",
                  )}
                >
                  <i.icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                  {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((i) => {
        const active = isActive(i);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              className={clsx(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                active ? "text-forest-900" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-vest-500"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <i.icon size={19} className="relative" />
              <span className="relative">{i.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
