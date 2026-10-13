"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, getPosition } from "@/lib/client";
import { Map } from "@/components/map/Map";

type Zone = { id: string; name: string; description: string | null };
type Initial = {
  phone: string;
  houseNumber: string | null;
  street: string | null;
  estate: string | null;
  city: string | null;
  state: string | null;
  landmark: string | null;
  houseDescription: string | null;
  zoneId: string | null;
  homeLat: number | null;
  homeLng: number | null;
};

export function HouseForm({ zones, initial, submitLabel }: { zones: Zone[]; initial: Initial; submitLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initial.homeLat != null && initial.homeLng != null ? { lat: initial.homeLat, lng: initial.homeLng } : null,
  );

  async function locate() {
    setLocating(true);
    try {
      const p = await getPosition();
      setPin({ lat: p.lat, lng: p.lng });
      toast.success("Pinned to where you're standing. Drag the pin to your gate if needed.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      const res = await api<{ redirect: string }>("/api/profile", {
        method: "PUT",
        body: { ...f, homeLat: pin?.lat ?? null, homeLng: pin?.lng ?? null },
      });
      toast.success("House details saved");
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="panel space-y-5 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label" htmlFor="houseNumber">
              House / plot no.
            </label>
            <input id="houseNumber" name="houseNumber" defaultValue={initial.houseNumber ?? ""} className="field" placeholder="Plot 14" required />
          </div>
          <div>
            <label className="label" htmlFor="street">
              Street
            </label>
            <input id="street" name="street" defaultValue={initial.street ?? ""} className="field" placeholder="3rd Avenue" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="estate">
            Estate or neighbourhood <span className="font-normal text-moss">(optional)</span>
          </label>
          <input id="estate" name="estate" defaultValue={initial.estate ?? ""} className="field" placeholder="Gwarinpa Estate" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="city">
              City / district
            </label>
            <input id="city" name="city" defaultValue={initial.city ?? "Abuja"} className="field" required />
          </div>
          <div>
            <label className="label" htmlFor="state">
              State
            </label>
            <input id="state" name="state" defaultValue={initial.state ?? "FCT"} className="field" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="zoneId">
            Service zone
          </label>
          <select id="zoneId" name="zoneId" defaultValue={initial.zoneId ?? ""} className="field" required>
            <option value="" disabled>
              Choose the zone your house is in
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
                {z.description ? ` — ${z.description}` : ""}
              </option>
            ))}
          </select>
          <p className="hint">Requests go to the crew that covers this zone.</p>
        </div>
        <div>
          <label className="label" htmlFor="landmark">
            Nearest landmark
          </label>
          <input
            id="landmark"
            name="landmark"
            defaultValue={initial.landmark ?? ""}
            className="field"
            placeholder="Opposite the blue water tank"
          />
        </div>
        <div>
          <label className="label" htmlFor="houseDescription">
            How the crew finds your bin <span className="font-normal text-moss">(optional)</span>
          </label>
          <textarea
            id="houseDescription"
            name="houseDescription"
            rows={3}
            defaultValue={initial.houseDescription ?? ""}
            className="field resize-none"
            placeholder="Black gate with cream fence. Bin is by the gate on the left."
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Contact phone
          </label>
          <input id="phone" name="phone" type="tel" defaultValue={initial.phone} className="field" required />
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel overflow-hidden p-2">
          <div className="h-[340px] overflow-hidden rounded-xl lg:h-[420px]">
            <Map pins={pin ? [{ id: "home", ...pin, tone: "vest" }] : []} editable onPick={(lat, lng) => setPin({ lat, lng })} className="h-full w-full" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <p className="text-sm text-moss">
              {pin ? "Drag the pin onto your gate." : "Tap the map or use your location to pin your house."}
            </p>
            <button type="button" onClick={locate} className="btn-outline btn-sm" disabled={locating}>
              {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
              Use my location
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-ember-100 px-4 py-3 text-sm font-medium text-ember-600">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={busy}>
          {busy && <Loader2 size={18} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
