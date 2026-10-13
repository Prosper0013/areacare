"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Role } from "@/db/schema";
import { api } from "@/lib/client";

const ROLES: { value: Role; label: string }[] = [
  { value: "USER", label: "Member" },
  { value: "STAFF", label: "Crew" },
  { value: "ADMIN", label: "Management" },
  { value: "SUPER_ADMIN", label: "Super admin" },
];

export function MemberActions({ userId, role, suspended, isSelf }: { userId: string; role: Role; suspended: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      await api(`/api/admin/users/${userId}`, { method: "PATCH", body });
      toast.success(done);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isSelf) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Role"
        value={role}
        disabled={busy}
        onChange={(e) => patch({ role: e.target.value }, "Role updated")}
        className="field w-auto py-2 text-sm"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {suspended ? (
        <button className="btn-outline btn-sm" disabled={busy} onClick={() => patch({ suspended: false }, "Account restored")}>
          Restore account
        </button>
      ) : (
        <button
          className="btn-danger btn-sm"
          disabled={busy}
          onClick={() => confirm("Suspend this account? They won't be able to request pickups.") && patch({ suspended: true }, "Account suspended")}
        >
          Suspend
        </button>
      )}
    </div>
  );
}
