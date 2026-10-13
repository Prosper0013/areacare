import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { membershipEnum, roleEnum, teams, users, type MembershipStatus, type Role } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { UserRow, type AdminUserRow } from "@/components/admin/UserRow";

export const metadata = { title: "People" };
export const dynamic = "force-dynamic";

const ROLE_FILTERS: { key: Role | "ALL"; label: string }[] = [
  { key: "ALL", label: "Everyone" },
  { key: "USER", label: "Members" },
  { key: "STAFF", label: "Crew" },
  { key: "ADMIN", label: "Management" },
  { key: "SUPER_ADMIN", label: "Super admins" },
];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string }> }) {
  const me = await requireUser(["SUPER_ADMIN"]);
  const { q, role, status } = await searchParams;
  const filters: SQL[] = [];
  if (q) filters.push(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.phone, `%${q}%`))!);
  if (role && (roleEnum.enumValues as readonly string[]).includes(role)) filters.push(eq(users.role, role as Role));
  if (status && (membershipEnum.enumValues as readonly string[]).includes(status))
    filters.push(eq(users.membershipStatus, status as MembershipStatus));

  const [rows, teamList] = await Promise.all([
    db.query.users.findMany({
      where: filters.length ? and(...filters) : undefined,
      orderBy: desc(users.createdAt),
      limit: 200,
      with: { zone: { columns: { name: true } }, teams: { columns: { teamId: true } } },
    }),
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
  ]);

  const data: AdminUserRow[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    membershipStatus: u.membershipStatus,
    paidThrough: u.paidThrough?.toISOString() ?? null,
    zone: u.zone?.name ?? null,
    teamIds: u.teams.map((t) => t.teamId),
    isSelf: u.id === me.id,
  }));

  return (
    <AppShell user={me}>
      <PageTitle
        title="People"
        subtitle="Change roles, put crew on teams, or suspend an account. Management and crew receive pickup alerts."
      />

      <form className="mb-5 flex flex-wrap gap-2" action="/admin/users">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="field max-w-sm flex-1" />
        <select name="role" defaultValue={role ?? ""} className="field w-auto" aria-label="Role">
          {ROLE_FILTERS.map((r) => (
            <option key={r.key} value={r.key === "ALL" ? "" : r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="field w-auto" aria-label="Membership">
          <option value="">Any membership</option>
          <option value="ACTIVE">Active</option>
          <option value="OVERDUE">Dues overdue</option>
          <option value="UNREGISTERED">Not registered</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button className="btn-dark">Search</button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-moss">
            <tr className="border-b border-forest-900/10">
              <th className="px-5 py-3 font-semibold">Person</th>
              <th className="px-5 py-3 font-semibold">Membership</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Teams</th>
              <th className="px-5 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <UserRow key={u.id} user={u} teams={teamList} />
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-moss">
                  No one matches that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
