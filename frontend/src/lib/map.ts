import type { CampusContent } from "./types";

export type LngLat = [lng: number, lat: number];
export type MapProvider = "mapbox" | "google" | "osm";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

/** Which map engine to render. Falls back so the map never renders blank. */
export function mapProvider(): MapProvider {
  const wanted = (process.env.NEXT_PUBLIC_MAP_PROVIDER || "").toLowerCase();
  if (wanted === "google" && GOOGLE_MAPS_KEY) return "google";
  if (wanted === "mapbox" && MAPBOX_TOKEN) return "mapbox";
  if (wanted === "osm") return "osm";
  if (GOOGLE_MAPS_KEY) return "google";
  if (MAPBOX_TOKEN) return "mapbox";
  return "osm";
}

/** Engines the student can switch between; only those with credentials are offered. */
export function availableProviders() {
  const list: { id: MapProvider; label: string; description: string }[] = [];
  if (GOOGLE_MAPS_KEY)
    list.push({ id: "google", label: "Google", description: "Google Maps" });
  if (MAPBOX_TOKEN)
    list.push({
      id: "mapbox",
      label: "Mapbox",
      description: "Mapbox Streets (3D)",
    });
  if (!list.length)
    list.push({
      id: "osm",
      label: "OpenStreetMap",
      description: "OpenStreetMap tiles",
    });
  return list;
}

/** Camera presets. Centres come from OpenStreetMap campus polygons. */
export const CAMPUS_VIEWS = {
  new: { center: [8.4262, 11.9724] as LngLat, zoom: 15.4, label: "New Campus" },
  old: { center: [8.4795, 11.9805] as LngLat, zoom: 15.6, label: "Old Campus" },
  all: {
    center: [8.453, 11.976] as LngLat,
    zoom: 13.1,
    label: "Both campuses",
  },
};

/** Default walking origin per campus when the browser has no location. */
export const CAMPUS_GATES: Record<string, { name: string; at: LngLat }> = {
  new: { name: "New Campus main grounds", at: [8.42529, 11.971] },
  old: { name: "Old Campus main gate", at: [8.48257, 11.98091] },
};

export const CATEGORY_COLORS: Record<string, string> = {
  Faculties: "#315efb",
  Departments: "#5b7cfa",
  "Lecture venues": "#7c3aed",
  Administration: "#0f766e",
  "Student services": "#0891b2",
  Hostels: "#d97706",
  Banks: "#16a34a",
  Health: "#dc2626",
  Safety: "#b91c1c",
  Worship: "#0e7490",
  Sport: "#ea580c",
  Transport: "#64748b",
  Landmarks: "#475569",
  "Gates & landmarks": "#475569",
};
export const colorFor = (category: string) =>
  CATEGORY_COLORS[category] || "#315efb";

export const toLngLat = (item: CampusContent): LngLat | null =>
  item.latitude != null && item.longitude != null
    ? [item.longitude, item.latitude]
    : null;

/** Great-circle distance in metres. */
export function distanceMetres(a: LngLat, b: LngLat) {
  const r = 6371000,
    toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]),
    dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export interface WalkingRoute {
  coordinates: LngLat[];
  distanceMetres: number;
  durationSeconds: number;
  /** "mapbox" when routed on the road network, "estimate" for straight line. */
  source: "mapbox" | "estimate";
}

/** Walking route via Mapbox Directions, or a straight-line estimate at 4.5 km/h. */
export async function walkingRoute(
  from: LngLat,
  to: LngLat,
  signal?: AbortSignal,
): Promise<WalkingRoute> {
  const estimate = (): WalkingRoute => {
    const d = distanceMetres(from, to);
    return {
      coordinates: [from, to],
      distanceMetres: d,
      durationSeconds: (d / 1.25) * 1.15,
      source: "estimate",
    };
  };
  if (!MAPBOX_TOKEN) return estimate();
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from.join(",")};${to.join(",")}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Directions HTTP ${res.status}`);
    const data = (await res.json()) as {
      routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: LngLat[] };
      }[];
    };
    const route = data.routes?.[0];
    if (!route) throw new Error("No route");
    return {
      coordinates: route.geometry.coordinates,
      distanceMetres: route.distance,
      durationSeconds: route.duration,
      source: "mapbox",
    };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return estimate();
  }
}

export const formatDuration = (seconds: number) => {
  const m = Math.max(1, Math.round(seconds / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
export const formatDistance = (metres: number) =>
  metres < 950
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1000).toFixed(1)} km`;

export const bounds = (points: LngLat[]) => {
  const lngs = points.map((p) => p[0]),
    lats = points.map((p) => p[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ] as [LngLat, LngLat];
};

export interface CampusMapProps {
  items: CampusContent[];
  selected: CampusContent | null;
  onSelect: (item: CampusContent | null) => void;
  campus: string;
  route: WalkingRoute | null;
  origin: { at: LngLat; name: string } | null;
  userLocation: LngLat | null;
}
