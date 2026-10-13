import "server-only";

export type DetectedAddress = {
  houseNumber: string;
  street: string;
  estate: string;
  city: string;
  state: string;
  landmark: string;
  zoneId: string | null;
  label: string;
};

type NominatimAddress = Partial<
  Record<
    | "house_number"
    | "road"
    | "pedestrian"
    | "street"
    | "residential"
    | "neighbourhood"
    | "suburb"
    | "quarter"
    | "hamlet"
    | "village"
    | "town"
    | "city"
    | "city_district"
    | "county"
    | "state"
    | "amenity"
    | "building"
    | "shop",
    string
  >
>;

const STATE_SHORT: Record<string, string> = { "Federal Capital Territory": "FCT" };

/** OpenStreetMap's free reverse geocoder. Overridable for tests (GEOCODER_URL). */
async function nominatim(lat: number, lng: number) {
  const base = process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org";
  const url = `${base}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}&accept-language=en`;
  const contact = process.env.SUPER_ADMIN_EMAIL || "admin@areacare.ng";
  const res = await fetch(url, {
    headers: { "User-Agent": `AreaCare/1.0 (${contact})`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  return (await res.json()) as { display_name?: string; address?: NominatimAddress };
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Picks the area whose name or neighbourhood list appears in the detected address.
 * Longer, more specific matches win (e.g. "Wuse II" beats "Wuse").
 */
export function matchZone(zones: { id: string; name: string; description: string | null }[], haystackParts: string[]) {
  const haystack = ` ${norm(haystackParts.filter(Boolean).join(" , "))} `;
  let best: { id: string; score: number } | null = null;
  for (const z of zones) {
    const tokens = [z.name, ...(z.description ?? "").split(/[,;/]|&|\band\b/)]
      .flatMap((t) => [t, ...t.split("&")])
      .map(norm)
      .filter((t) => t.length >= 3);
    for (const t of new Set(tokens)) {
      if (haystack.includes(` ${t} `)) {
        const score = t.length + (norm(z.name).includes(t) ? 2 : 0);
        if (!best || score > best.score) best = { id: z.id, score };
      }
    }
  }
  return best?.id ?? null;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  zones: { id: string; name: string; description: string | null }[],
): Promise<DetectedAddress> {
  const data = await nominatim(lat, lng);
  const a = data.address ?? {};
  const street = a.road || a.pedestrian || a.street || "";
  const estate = a.residential || a.neighbourhood || a.quarter || a.suburb || a.hamlet || "";
  const city = a.city || a.town || a.village || a.city_district || a.county || "";
  const state = a.state ? (STATE_SHORT[a.state] ?? a.state) : "";
  const landmark = a.amenity || a.building || a.shop || "";

  const zoneId = matchZone(zones, [
    a.neighbourhood ?? "",
    a.residential ?? "",
    a.quarter ?? "",
    a.suburb ?? "",
    a.city_district ?? "",
    a.town ?? "",
    a.village ?? "",
    a.city ?? "",
    a.county ?? "",
    data.display_name ?? "",
  ]);

  return {
    houseNumber: a.house_number ?? "",
    street,
    estate: estate && estate !== city ? estate : "",
    city,
    state,
    landmark,
    zoneId,
    label: data.display_name ?? "",
  };
}
