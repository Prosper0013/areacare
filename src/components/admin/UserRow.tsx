"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import clsx from "clsx";
import type { MembershipStatus, Role } from "@/db/schema";
import { api } from "@/lib/client";
import { shortDate } from "@/lib/format";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  membershipStatus: MembershipStatus;
  paidThrough: string | null;
  zone: string | null;
  teamIds: string[];
  isSelf: boolean;
};

const ROLES: { value: Role; label: string }[] = [
  { value: "USER", label: "Member" },
  { value: "STAFF", label: "Crew" },
  { value: "ADMIN", label: "Management" },
  { value: "SUPER_ADMIN", label: "Super admin" },
];

const STATUS: Record<MembershipStatus, [string, string]> = {
  ACTIVE: ["Active", "bg-forest-100 text-forest-700"],
  OVERDUE: ["Overdue", "bg-ember-100 text-ember-600"],
  UNREGISTERED: ["Not registered", "bg-forest-900/5 text-moss"],
  SUSPENDED: ["Suspended", "bg-forest-900 text-white"],
};

export function UserRow({ user, teams }: { user: AdminUserRow; teams: { id: string; name: string }[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [teamIds, setTeamIds] = useState(user.teamIds);

  async function patch(body: Record<string, unknown>, done: string) {
    setSaving(true);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body });
      toast.success(done);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const [statusLabel, statusCls] = STATUS[user.membershipStatus];
  const isMember = user.role === "USER";

  return (
    <tr className={clsx("border-b border-forest-900/5 align-top last:border-0", saving && "opacity-60")}>
      <td className="px-5 py-4">
        <Link href={`/admin/users/${user.id}`} className="font-semibold hover:underline">
          {user.name}
        </Link>{" "}
        {user.isSelf && <span className="text-xs font-normal text-moss">(you)</span>}
        <p className="text-moss">{user.email}</p>
        <p className="text-moss">
          {user.phone}
          {user.zone ? ` · ${user.zone}` : ""}
        </p>
      </td>
      <td className="px-5 py-4">
        {isMember || user.membershipStatus === "SUSPENDED" ? (
          <>
            <span className={clsx("chip", statusCls)}>{statusLabel}</span>
            {user.paidThrough && <p className="mt-1 text-xs text-moss">to {shortDate(user.paidThrough)}</p>}
          </>
        ) : (
          <span className="text-moss">—</span>
        )}
      </td>
      <td className="px-5 py-4">
        <select
          aria-label={`Role for ${user.name}`}
          value={user.role}
          disabled={saving || user.isSelf}
          onChange={(e) => patch({ role: e.target.value }, `${user.name} is now ${ROLES.find((r) => r.value === e.target.value)?.label}`)}
          className="field w-40 py-2"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-4">
        {user.role === "USER" ? (
          <span className="text-moss">Members aren't on teams</span>
        ) : teams.length === 0 ? (
          <span className="text-moss">Create a team first</span>
        ) : (
          <div className="flex max-w-xs flex-wrap gap-1.5">
            {teams.map((t) => {
              const on = teamIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  disabled={saving}
                  onClick={() => {
                    const next = on ? teamIds.filter((x) => x !== t.id) : [...teamIds, t.id];
                    setTeamIds(next);
                    patch({ teamIds: next }, on ? `Removed from ${t.name}` : `Added to ${t.name}`);
                  }}
                  aria-pressed={on}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-semibold transition",
                    on ? "bg-forest-600 text-white" : "bg-forest-900/5 text-moss hover:bg-forest-900/10",
                  )}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
      </td>
      <td className="px-5 py-4 text-right">
        {!user.isSelf &&
          (user.membershipStatus === "SUSPENDED" ? (
            <button className="btn-outline btn-sm" disabled={saving} onClick={() => patch({ suspended: false }, "Account restored")}>
              Restore
            </button>
          ) : (
            <button
              className="btn-danger btn-sm"
              disabled={saving}
              onClick={() => confirm(`Suspend ${user.name}? They won't be able to request pickups.`) && patch({ suspended: true }, "Account suspended")}
            >
              Suspend
            </button>
          ))}
      </td>
    </tr>
  );
}
