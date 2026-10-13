"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { api } from "@/lib/client";

export function MarkAllRead() {
  const router = useRouter();
  return (
    <button
      className="btn-outline btn-sm"
      onClick={async () => {
        await api("/api/notifications", { body: {} });
        router.refresh();
      }}
    >
      <CheckCheck size={16} /> Mark all read
    </button>
  );
}
