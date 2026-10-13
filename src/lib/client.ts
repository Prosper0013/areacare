"use client";

/** Small fetch wrapper for the browser: returns JSON or throws an Error with the API's message. */
export async function api<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export type Coords = { lat: number; lng: number; accuracy: number };

export function getPosition(timeout = 12000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This browser can't share location."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked. Allow location for this site in your browser settings."
              : "Couldn't get your location. Move closer to a window and try again.",
          ),
        ),
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 },
    );
  });
}
