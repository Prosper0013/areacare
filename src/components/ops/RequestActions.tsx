"use client";

import { useRouter } from "next/navigation";
import type { PickupStatus } from "@/db/schema";
import { PickupActions } from "./PickupActions";

export function RequestActions({
  id,
  status,
  canCancel,
  reminders,
}: {
  id: string;
  status: PickupStatus;
  canCancel: boolean;
  reminders: number;
}) {
  const router = useRouter();
  return (
    <PickupActions
      id={id}
      status={status}
      size="lg"
      allowCancel={canCancel}
      isManagement={canCancel}
      reminders={reminders}
      onChange={() => router.refresh()}
    />
  );
}
