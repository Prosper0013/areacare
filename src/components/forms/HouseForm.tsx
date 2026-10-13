"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Loader2, MapPin, Wand2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
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

type Fields = {
  houseNumber: string;
  street: string;
  estate: string;
  city: string;
  state: string;
  landmark: string;
  houseDescription: string;
  zoneId: string;
  phone: string;
};

type Detected = {
  houseNumber: string;
  street: string;
  estate: string;
  city: string;
  state: string;
  landmark: string;
  zoneId: string | null;
  label: string;
};

export function HouseForm({ zones, initial, submitLabel }: { zones: Zone[]; initial: Initial; submitLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState<"gps" | "lookup" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState<Set<keyof Fields>>(new Set());
  const [detectedLabel, setDetectedLabel] = useState<string | null>(null);
  const [pinMoved, setPinMoved] = useState(false);
  const [f, setF] = useState<Fields>({
    houseNumber: initial.houseNumber ?? "",
    street: initial.street ?? "",
    estate: initial.estate ?? "",
    city: initial.city ?? "Abuja",
    state: initial.state ?? "FCT",
    landmark: initial.landmark ?? "",
    houseDescription: initial.houseDescription ?? "",
    zoneId: initial.zoneId ?? "",
    phone: initial.phone,
  });
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initial.homeLat != null && initial.homeLng != null ? { lat: initial.homeLat, lng: initial.homeLng } : null,
  );

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((prev) => ({ ...prev, [k]: e.target.value }));
    setFilled((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  };

  /** Looks up the street address for a point and fills in the form. */
  async function fillFrom(lat: number, lng: number) {
    setLocating("lookup");
    try {
      const { address } = await api<{ address: Detected }>(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
      const changed = new Set<keyof Fields>();
      setF((prev) => {
        const next = { ...prev };
        const put = (k: keyof Fields, v: string | null | undefined) => {
          if (v) {
            next[k] = v;
            changed.add(k);
          }
        };
        put("houseNumber", address.houseNumber);
        put("street", address.street);
        put("estate", address.estate);
        put("city", address.city);
        put("state", address.state);
        if (!prev.landmark) put("landmark", address.landmark);
        put("zoneId", address.zoneId);
        return next;
      });
      setFilled(changed);
      setDetectedLabel(address.label);
      setPinMoved(false);
      const zone = zones.find((z) => z.id === address.zoneId);
      toast.success("Address filled from your location", {
        description: zone
          ? `Area: ${zone.name}. Check the details and add your house number if it's missing.`
          : "We couldn't match an area. Please choose yours from the list.",
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLocating(null);
    }
  }

  async function useMyLocation() {
    setLocating("gps");
    try {
      const p = await getPosition();
      setPin({ lat: p.lat, lng: p.lng });
      await fillFrom(p.lat, p.lng);
    } catch (err) {
      toast.error((err as Error).message);
      setLocating(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
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

  const hl = (k: keyof Fields) => clsx("field transition-colors", filled.has(k) && "border-forest-600 bg-forest-50");

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="panel space-y-5 p-6 sm:p-8">
        {/* One tap to detect */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-forest-900 p-4 text-white">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-vest-500 text-forest-900">
            <MapPin size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Are you at home right now?</p>
            <p className="text-sm text-white/70">We'll detect your address and fill this form for you.</p>
          </div>
          <button type="button" onClick={useMyLocation} disabled={!!locating} className="btn-vest btn-sm">
            {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
            {locating === "gps" ? "Finding you…" : locating === "lookup" ? "Reading address…" : "Use my current location"}
          </button>
        </div>
        <AnimatePresence>
          {detectedLabel && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl bg-forest-50 px-4 py-2.5 text-sm text-forest-700"
            >
              <span className="font-semibold">Detected:</span> {detectedLabel}. Highlighted fields were filled in — please check them.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label" htmlFor="houseNumber">
              House / plot no.
            </label>
            <input id="houseNumber" name="houseNumber" value={f.houseNumber} onChange={set("houseNumber")} className={hl("houseNumber")} placeholder="Plot 14" required />
          </div>
          <div>
            <label className="label" htmlFor="street">
              Street
            </label>
            <input id="street" name="street" value={f.street} onChange={set("street")} className={hl("street")} placeholder="3rd Avenue" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="estate">
            Estate or neighbourhood <span className="font-normal text-moss">(optional)</span>
          </label>
          <input id="estate" name="estate" value={f.estate} onChange={set("estate")} className={hl("estate")} placeholder="Gwarinpa Estate" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="city">
              City / district
            </label>
            <input id="city" name="city" value={f.city} onChange={set("city")} className={hl("city")} required />
          </div>
          <div>
            <label className="label" htmlFor="state">
              State
            </label>
            <input id="state" name="state" value={f.state} onChange={set("state")} className={hl("state")} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="zoneId">
            Service area
          </label>
          <select id="zoneId" name="zoneId" value={f.zoneId} onChange={set("zoneId")} className={hl("zoneId")} required>
            <option value="" disabled>
              Choose the area your house is in
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
                {z.description ? ` — ${z.description}` : ""}
              </option>
            ))}
          </select>
          <p className="hint">Requests go to the crew that covers this area.</p>
        </div>
        <div>
          <label className="label" htmlFor="landmark">
            Nearest landmark
          </label>
          <input id="landmark" name="landmark" value={f.landmark} onChange={set("landmark")} className={hl("landmark")} placeholder="Opposite the blue water tank" />
        </div>
        <div>
          <label className="label" htmlFor="houseDescription">
            How the crew finds your bin <span className="font-normal text-moss">(optional)</span>
          </label>
          <textarea
            id="houseDescription"
            name="houseDescription"
            rows={3}
            value={f.houseDescription}
            onChange={set("houseDescription")}
            className="field resize-none"
            placeholder="Black gate with cream fence. Bin is by the gate on the left."
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Contact phone
          </label>
          <input id="phone" name="phone" type="tel" value={f.phone} onChange={set("phone")} className="field" required />
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel overflow-hidden p-2">
          <div className="h-[340px] overflow-hidden rounded-xl lg:h-[420px]">
            <Map
              pins={pin ? [{ id: "home", ...pin, tone: "vest" }] : []}
              editable
              onPick={(lat, lng) => {
                setPin({ lat, lng });
                setPinMoved(true);
              }}
              className="h-full w-full"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <p className="text-sm text-moss">
              {pin ? "Drag the pin onto your gate if it's slightly off." : "Tap the map to pin your house, or use your current location."}
            </p>
            {pin && pinMoved && (
              <button type="button" onClick={() => fillFrom(pin.lat, pin.lng)} disabled={!!locating} className="btn-outline btn-sm">
                {locating === "lookup" ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Fill address from pin
              </button>
            )}
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
