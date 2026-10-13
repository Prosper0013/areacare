import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { teams, users, zones } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { TeamsManager } from "@/components/admin/TeamsManager";

export const metadata = { title: "Teams & zones" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const user = await requireUser(["SUPER_ADMIN"]);
  const [teamRows, zoneRows, staff] = await Promise.all([
    db.query.teams.findMany({
      orderBy: asc(teams.name),
      with: { zones: { columns: { zoneId: true } }, members: { columns: { userId: true } } },
    }),
    db.select().from(zones).orderBy(asc(zones.name)),
    db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(inArray(users.role, ["STAFF", "ADMIN", "SUPER_ADMIN"]))
      .orderBy(asc(users.name)),
  ]);

  return (
    <AppShell user={user}>
      <PageTitle
        title="Teams & zones"
        subtitle="A team gets alerts for the zones it covers. Management always gets every alert."
      />
      <TeamsManager
        teams={teamRows.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          zoneIds: t.zones.map((z) => z.zoneId),
          memberIds: t.members.map((m) => m.userId),
        }))}
        zones={zoneRows.map((z) => ({ id: z.id, name: z.name, description: z.description }))}
        staff={staff}
      />
    </AppShell>
  );
}
