"use client";

import { usePathname } from "next/navigation";
import { ConfirmClearance, type AwaitingPickup } from "./ConfirmClearance";

/** Shows the sticky confirm strip on every member page except home, which has the full prompt. */
export function ConfirmBarGate({ pickup }: { pickup: AwaitingPickup }) {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;
  return <ConfirmClearance pickup={pickup} variant="bar" />;
}
