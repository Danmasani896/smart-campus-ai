"use client";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { CampusContent } from "@/lib/types";
function Center({ selected }: { selected: CampusContent | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected?.latitude != null && selected.longitude != null)
      map.setView([selected.latitude, selected.longitude], 16);
  }, [selected, map]);
  return null;
}
export default function CampusMap({
  items,
  selected,
  onSelect,
}: {
  items: CampusContent[];
  selected: CampusContent | null;
  onSelect: (item: CampusContent) => void;
}) {
  return (
    <MapContainer center={[12, 8.5]} zoom={11} scrollWheelZoom={false}>
      <TileLayer
        attribution={
          process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
          "© OpenStreetMap contributors"
        }
        url={
          process.env.NEXT_PUBLIC_MAP_TILE_URL ||
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        }
      />
      <Center selected={selected} />
      {items
        .filter((i) => i.verified && i.latitude != null && i.longitude != null)
        .map((item) => (
          <CircleMarker
            key={item.id}
            center={[item.latitude!, item.longitude!]}
            radius={selected?.id === item.id ? 11 : 8}
            pathOptions={{
              color: "#fff",
              weight: 3,
              fillColor: "#315efb",
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(item) }}
          >
            <Popup>
              <strong>{item.title}</strong>
              <p>{item.body.slice(0, 160)}</p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}&travelmode=walking`}
                target="_blank"
                rel="noreferrer"
              >
                Open walking directions ↗
              </a>
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
