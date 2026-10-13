"use client";

import { useEffect } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapPin = { id: string; lat: number; lng: number; label?: string; tone?: "vest" | "forest" | "ember"; href?: string };

const COLORS = { vest: "#F2B705", forest: "#1F7A4D", ember: "#C2410C" };

function pinIcon(tone: MapPin["tone"] = "forest") {
  const c = COLORS[tone];
  return L.divIcon({
    className: "",
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
    html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 43s15-14.6 15-26A15 15 0 0 0 2 17c0 11.4 15 26 15 26Z" fill="${c}" stroke="#14231C" stroke-opacity=".25"/>
      <circle cx="17" cy="17" r="6" fill="#fff"/></svg>`,
  });
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 16);
    else map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
  }, [map, pins]);
  return null;
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

const ABUJA: [number, number] = [9.0765, 7.3986];

export default function LeafletMap({
  pins = [],
  editable,
  onPick,
  accuracy,
  className,
}: {
  pins?: MapPin[];
  editable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  accuracy?: number | null;
  className?: string;
}) {
  const center: [number, number] = pins[0] ? [pins[0].lat, pins[0].lng] : ABUJA;
  return (
    <MapContainer center={center} zoom={pins.length ? 15 : 12} scrollWheelZoom={false} className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      {editable && onPick && <ClickToPlace onPick={onPick} />}
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p.tone)}
          draggable={editable}
          eventHandlers={
            editable && onPick
              ? { dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onPick(ll.lat, ll.lng); } }
              : undefined
          }
        >
          {p.label && (
            <Popup>
              {p.href ? (
                <a href={p.href} style={{ fontWeight: 600 }}>
                  {p.label}
                </a>
              ) : (
                p.label
              )}
            </Popup>
          )}
        </Marker>
      ))}
      {accuracy && pins[0] && accuracy < 2000 && (
        <Circle center={[pins[0].lat, pins[0].lng]} radius={accuracy} pathOptions={{ color: "#1F7A4D", weight: 1, fillOpacity: 0.08 }} />
      )}
    </MapContainer>
  );
}
