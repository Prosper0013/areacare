"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so it's only ever rendered in the browser.
export const Map = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[inherit] bg-forest-100" />,
});
export type { MapPin } from "./LeafletMap";
