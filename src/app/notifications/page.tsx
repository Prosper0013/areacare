import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import clsx from "clsx";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { PushToggle } from "@/components/shell/PushToggle";
import { MarkAllRead } from "@/components/MarkAllRead";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.query.notifications.findMany({
    where: eq(notifications.userId, user.id),
    orderBy: desc(notifications.createdAt),
    limit: 100,
  });

  return (
    <AppShell user={user}>
      <PageTitle title="Notifications" action={items.some((n) => !n.read) ? <MarkAllRead /> : undefined} />
      <PushToggle className="mb-6" />
      {items.length === 0 ? (
        <div className="panel p-10 text-center text-moss">Updates about pickups and payments will appear here.</div>
      ) : (
        <ul className="panel divide-y divide-forest-900/5 overflow-hidden">
          {items.map((n) => {
            const inner = (
              <div className={clsx("flex gap-4 px-5 py-4 transition hover:bg-forest-50", !n.read && "bg-vest-100/40")}>
                <span
                  className={clsx("mt-2 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-ember-600")}
                  aria-label={n.read ? undefined : "Unread"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-xs text-moss">{timeAgo(n.createdAt)}</p>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-moss">{n.body}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}
    </AppShell>
  );
}
