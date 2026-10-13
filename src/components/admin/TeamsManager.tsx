"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MapPinned, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/client";

type Team = { id: string; name: string; description: string | null; zoneIds: string[]; memberIds: string[] };
type Zone = { id: string; name: string; description: string | null };
type Staff = { id: string; name: string; role: string };

export function TeamsManager({ teams, zones, staff }: { teams: Team[]; zones: Zone[]; staff: Staff[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function toggle(team: Team, field: "zoneIds" | "memberIds", id: string) {
    const list = team[field].includes(id) ? team[field].filter((x) => x !== id) : [...team[field], id];
    run(team.id + field, () => api(`/api/admin/teams/${team.id}`, { method: "PATCH", body: { [field]: list } }), "Team updated");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      {/* Teams */}
      <div className="space-y-4">
        <CreateForm
          label="New team"
          placeholder="e.g. Gwarinpa crew"
          busy={busy === "new-team"}
          onCreate={(name, description) =>
            run("new-team", () => api("/api/admin/teams", { body: { name, description } }), `${name} created`)
          }
        />
        <AnimatePresence initial={false}>
          {teams.map((t) => (
            <motion.section
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={clsx("panel p-6", busy?.startsWith(t.id) && "opacity-70")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{t.name}</h2>
                  {t.description && <p className="text-moss">{t.description}</p>}
                </div>
                <button
                  className="rounded-lg p-2 text-moss hover:bg-ember-100 hover:text-ember-600"
                  aria-label={`Delete ${t.name}`}
                  onClick={() =>
                    confirm(`Delete ${t.name}? Its members stay in the system.`) &&
                    run(t.id, () => api(`/api/admin/teams/${t.id}`, { method: "DELETE" }), "Team deleted")
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <p className="mb-2 mt-5 flex items-center gap-2 text-sm font-semibold">
                <MapPinned size={16} className="text-forest-600" /> Zones covered
              </p>
              <ChipSet
                options={zones.map((z) => ({ id: z.id, label: z.name }))}
                selected={t.zoneIds}
                onToggle={(id) => toggle(t, "zoneIds", id)}
                empty="Add a zone first"
              />

              <p className="mb-2 mt-5 flex items-center gap-2 text-sm font-semibold">
                <Users size={16} className="text-forest-600" /> Crew members
              </p>
              <ChipSet
                options={staff.map((s) => ({ id: s.id, label: s.name }))}
                selected={t.memberIds}
                onToggle={(id) => toggle(t, "memberIds", id)}
                empty="Make someone Crew on the People page first"
              />
            </motion.section>
          ))}
        </AnimatePresence>
        {teams.length === 0 && <p className="panel p-8 text-center text-moss">No teams yet. Create one above.</p>}
      </div>

      {/* Zones */}
      <div>
        <section className="panel sticky top-24 p-6">
          <h2 className="text-xl font-bold">Zones</h2>
          <p className="mb-4 text-sm text-moss">Members pick one of these when they add their house.</p>
          <CreateForm
            label="New zone"
            placeholder="e.g. Lokogoma"
            compact
            busy={busy === "new-zone"}
            onCreate={(name, description) =>
              run("new-zone", () => api("/api/admin/zones", { body: { name, description } }), `${name} added`)
            }
          />
          <ul className="mt-4 divide-y divide-forest-900/5">
            {zones.map((z) => {
              const covered = teams.some((t) => t.zoneIds.includes(z.id));
              return (
                <li key={z.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{z.name}</p>
                    <p className={clsx("text-xs", covered ? "text-moss" : "font-semibold text-ember-600")}>
                      {covered ? z.description || "Covered" : "No team covers this zone"}
                    </p>
                  </div>
                  <button
                    className="rounded-lg p-2 text-moss hover:bg-ember-100 hover:text-ember-600"
                    aria-label={`Delete ${z.name}`}
                    onClick={() =>
                      confirm(`Delete ${z.name}? Members in this zone will need to pick a new one.`) &&
                      run(z.id, () => api(`/api/admin/zones/${z.id}`, { method: "DELETE" }), "Zone deleted")
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ChipSet({
  options,
  selected,
  onToggle,
  empty,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  empty: string;
}) {
  if (!options.length) return <p className="text-sm text-moss">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            aria-pressed={on}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              on ? "bg-forest-600 text-white" : "bg-forest-900/5 text-moss hover:bg-forest-900/10",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CreateForm({
  label,
  placeholder,
  busy,
  compact,
  onCreate,
}: {
  label: string;
  placeholder: string;
  busy: boolean;
  compact?: boolean;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name.trim(), description.trim());
        setName("");
        setDescription("");
      }}
      className={clsx("flex flex-wrap gap-2", !compact && "panel p-4")}
    >
      <input aria-label={label} value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className="field min-w-0 flex-1 py-2.5" />
      {!compact && (
        <input
          aria-label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="field min-w-0 flex-1 py-2.5"
        />
      )}
      <button className="btn-dark btn-sm" disabled={busy || !name.trim()}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        {compact ? "Add" : "Create team"}
      </button>
    </form>
  );
}
