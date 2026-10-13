"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPinned, Pencil, Plus, Trash2, Users } from "lucide-react";
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
                <MapPinned size={16} className="text-forest-600" /> Areas covered
              </p>
              <ChipSet
                options={zones.map((z) => ({ id: z.id, label: z.name }))}
                selected={t.zoneIds}
                onToggle={(id) => toggle(t, "zoneIds", id)}
                empty="Add an area first"
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

      {/* Areas */}
      <div>
        <section className="panel sticky top-24 p-6">
          <h2 className="text-xl font-bold">Areas covered</h2>
          <p className="mb-4 text-sm text-moss">
            Members pick one when they add their house. List the neighbourhoods in each area so
            &ldquo;Use my current location&rdquo; can choose it for them.
          </p>
          <AreaForm
            busy={busy === "new-zone"}
            submitLabel="Add area"
            onSubmit={(name, description) =>
              run("new-zone", () => api("/api/admin/zones", { body: { name, description } }), `${name} added`)
            }
          />
          <ul className="mt-4 divide-y divide-forest-900/5">
            {zones.map((z) => (
              <AreaRow
                key={z.id}
                zone={z}
                covered={teams.some((t) => t.zoneIds.includes(z.id))}
                busy={busy === z.id}
                onSave={(name, description) =>
                  run(z.id, () => api(`/api/admin/zones/${z.id}`, { method: "PATCH", body: { name, description } }), `${name} updated`)
                }
                onDelete={() =>
                  confirm(`Delete ${z.name}? Members in this area will need to pick a new one.`) &&
                  run(z.id, () => api(`/api/admin/zones/${z.id}`, { method: "DELETE" }), "Area deleted")
                }
              />
            ))}
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

function AreaForm({
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { name: string; description: string | null };
  busy: boolean;
  submitLabel: string;
  onSubmit: (name: string, description: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit(name.trim(), description.trim());
        if (!initial) {
          setName("");
          setDescription("");
        }
      }}
      className="space-y-2"
    >
      <input aria-label="Area name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Area name, e.g. Lokogoma" className="field py-2.5" />
      <input
        aria-label="Neighbourhoods in this area"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Neighbourhoods, comma-separated (e.g. Lokogoma, Galadimawa)"
        className="field py-2.5 text-sm"
      />
      <div className="flex gap-2">
        <button className="btn-dark btn-sm" disabled={busy || !name.trim()}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : initial ? <Check size={15} /> : <Plus size={15} />}
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function AreaRow({
  zone,
  covered,
  busy,
  onSave,
  onDelete,
}: {
  zone: Zone;
  covered: boolean;
  busy: boolean;
  onSave: (name: string, description: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="py-3">
        <AreaForm
          initial={zone}
          busy={busy}
          submitLabel="Save"
          onSubmit={(n, d) => {
            onSave(n, d);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{zone.name}</p>
        {zone.description && <p className="truncate text-xs text-moss">{zone.description}</p>}
        {!covered && <p className="text-xs font-semibold text-ember-600">No team covers this area</p>}
      </div>
      <div className="flex shrink-0">
        <button className="rounded-lg p-2 text-moss hover:bg-forest-50 hover:text-forest-900" aria-label={`Edit ${zone.name}`} onClick={() => setEditing(true)}>
          <Pencil size={16} />
        </button>
        <button className="rounded-lg p-2 text-moss hover:bg-ember-100 hover:text-ember-600" aria-label={`Delete ${zone.name}`} onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}
