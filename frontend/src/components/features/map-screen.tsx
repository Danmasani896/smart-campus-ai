"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Footprints,
  ListFilter,
  LocateFixed,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useCampus, useFilteredContent } from "../providers";
import { Badge, ErrorNotice, Loading } from "../ui";
import { campusName, type CampusContent } from "@/lib/types";
import {
  CAMPUS_GATES,
  availableProviders,
  colorFor,
  formatDistance,
  formatDuration,
  mapProvider,
  type MapProvider,
  toLngLat,
  walkingRoute,
  type CampusMapProps,
  type LngLat,
  type WalkingRoute,
} from "@/lib/map";
import { Source } from "./content-screens";

const loading = () => (
  <div className="map-canvas map-canvas-loading">
    <Loading />
  </div>
);
// Every engine is available; the student picks one from the toolbar.
const ENGINES: Record<MapProvider, React.ComponentType<CampusMapProps>> = {
  google: dynamic<CampusMapProps>(() => import("./map/google-map"), {
    ssr: false,
    loading,
  }),
  mapbox: dynamic<CampusMapProps>(() => import("./map/mapbox-map"), {
    ssr: false,
    loading,
  }),
  osm: dynamic<CampusMapProps>(() => import("./campus-map"), {
    ssr: false,
    loading,
  }),
};
const ENGINE_OPTIONS = availableProviders();
const ENGINE_KEY = "campus-map-engine";

const CAMPUS_OPTIONS = [
  { id: "all", label: "Both" },
  { id: "old", label: "Old Campus" },
  { id: "new", label: "New Campus" },
];

export function MapScreen() {
  const all = useFilteredContent().filter((c) =>
      ["location", "faculty", "department"].includes(c.kind),
    ),
    { loading, error, campus, setCampus } = useCampus(),
    params = useSearchParams(),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [selected, setSelected] = useState<CampusContent | null>(null),
    [panelOpen, setPanelOpen] = useState(true),
    [route, setRoute] = useState<WalkingRoute | null>(null),
    [routing, setRouting] = useState(false),
    [origin, setOrigin] = useState<{ at: LngLat; name: string } | null>(null),
    [userLocation, setUserLocation] = useState<LngLat | null>(null),
    [locating, setLocating] = useState(false),
    [locateError, setLocateError] = useState(""),
    [destination, setDestination] = useState<CampusContent | null>(null),
    [engine, setEngine] = useState<MapProvider>(mapProvider),
    routeAbort = useRef<AbortController | null>(null);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(all.map((c) => c.category))).sort()],
    [all],
  );
  const items = useMemo(
    () =>
      all.filter(
        (c) =>
          (category === "All" || c.category === category) &&
          `${c.title} ${c.body} ${c.category}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [all, category, query],
  );
  const mapped = items.filter((c) => c.latitude != null);

  // Remember the chosen map engine per browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ENGINE_KEY) as MapProvider | null;
      if (saved && ENGINE_OPTIONS.some((o) => o.id === saved)) setEngine(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  function chooseEngine(next: MapProvider) {
    setEngine(next);
    try {
      localStorage.setItem(ENGINE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }
  const CampusMap = ENGINES[engine];

  // Deep links from chat: /map?id=…
  const availableIds = all.map((c) => c.id).join(",");
  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    const hit = all.find((c) => c.id === id);
    if (hit) {
      setSelected(hit);
      if (hit.campus !== "all" && campus !== "all" && hit.campus !== campus)
        setCampus(hit.campus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, availableIds]);

  // A drawn route belongs to its destination: closing the card keeps it,
  // choosing a different place clears it.
  useEffect(() => {
    if (!selected || !destination || selected.id === destination.id) return;
    clearRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);
  function clearRoute() {
    routeAbort.current?.abort();
    setRoute(null);
    setRouting(false);
    setDestination(null);
    setOrigin(null);
  }

  function select(item: CampusContent | null) {
    setSelected(item);
  }
  // On phones the list and the place card share the bottom edge.
  useEffect(() => {
    if (selected && window.innerWidth < 850) setPanelOpen(false);
  }, [selected]);

  function locate() {
    if (!navigator.geolocation) {
      setLocateError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
        setLocating(false);
      },
      () => {
        setLocateError(
          "Couldn’t read your location. Directions will start from the campus gate.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  async function directions() {
    const to = selected && toLngLat(selected);
    if (!to) return;
    const gate = CAMPUS_GATES[selected!.campus] || CAMPUS_GATES.new;
    const from = userLocation
      ? { at: userLocation, name: "Your location" }
      : { at: gate.at, name: gate.name };
    setOrigin(from);
    setDestination(selected);
    setRouting(true);
    routeAbort.current?.abort();
    const ctrl = new AbortController();
    routeAbort.current = ctrl;
    try {
      setRoute(await walkingRoute(from.at, to, ctrl.signal));
    } catch {
      /* aborted */
    } finally {
      if (!ctrl.signal.aborted) setRouting(false);
    }
  }

  const dest = selected && toLngLat(selected);
  return (
    <div className="map-screen">
      <CampusMap
        key={engine}
        items={mapped}
        selected={selected}
        onSelect={select}
        campus={campus}
        route={route}
        origin={origin}
        userLocation={userLocation}
      />

      {/* Top bar: campus switch + locate */}
      <div className="map-topbar">
        {ENGINE_OPTIONS.length > 1 && (
          <div
            className="map-segment map-segment-engine"
            role="tablist"
            aria-label="Map style"
          >
            {ENGINE_OPTIONS.map((o) => (
              <button
                key={o.id}
                role="tab"
                aria-selected={engine === o.id}
                className={engine === o.id ? "active" : ""}
                onClick={() => chooseEngine(o.id)}
                title={o.description}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        <div className="map-segment" role="tablist" aria-label="Campus">
          {CAMPUS_OPTIONS.map((o) => (
            <button
              key={o.id}
              role="tab"
              aria-selected={campus === o.id}
              className={campus === o.id ? "active" : ""}
              onClick={() => {
                setSelected(null);
                setCampus(o.id as typeof campus);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          className={`map-fab ${userLocation ? "is-on" : ""}`}
          onClick={locate}
          aria-label="Use my location"
          title="Use my location"
          disabled={locating}
        >
          <LocateFixed size={17} className={locating ? "spin" : ""} />
        </button>
      </div>

      {/* Left panel */}
      <aside
        className={`map-panel ${panelOpen ? "" : "is-collapsed"}`}
        aria-label="Places"
      >
        <div className="map-panel-head">
          <div>
            <p className="eyebrow">CAMPUS MAP</p>
            <h1>Find your place at BUK</h1>
          </div>
          <button
            className="icon-button"
            onClick={() => setPanelOpen(false)}
            aria-label="Hide list"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <label className="map-search">
          <Search size={15} />
          <input
            aria-label="Find a campus location"
            placeholder="Search buildings, halls, banks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="map-chips" role="group" aria-label="Category">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              style={
                c !== "All"
                  ? ({ "--chip": colorFor(c) } as React.CSSProperties)
                  : undefined
              }
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {error && <ErrorNotice message={error} />}
        <p className="muted-note">
          <ListFilter size={12} className="inline mr-1" />
          {mapped.length} places · {campusName(campus)}
        </p>
        {loading ? (
          <Loading />
        ) : (
          <ul className="map-list">
            {items.map((item, i) => (
              <li
                key={item.id}
                style={{ animationDelay: `${Math.min(i * 22, 500)}ms` }}
              >
                <button
                  className={`map-item ${selected?.id === item.id ? "is-selected" : ""}`}
                  onClick={() => select(item)}
                >
                  <i style={{ background: colorFor(item.category) }} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {campusName(item.campus)} · {item.category}
                      {item.latitude == null && " · awaiting coordinates"}
                    </small>
                  </span>
                </button>
              </li>
            ))}
            {!items.length && (
              <li className="map-empty">No places match “{query}”.</li>
            )}
          </ul>
        )}
      </aside>
      {!panelOpen && (
        <button className="map-panel-toggle" onClick={() => setPanelOpen(true)}>
          <MapPin size={15} /> Places
        </button>
      )}

      {/* Compact trip summary while the card is closed */}
      {route && destination && !selected && (
        <div className="map-trip" role="status">
          <Footprints size={16} />
          <div>
            <strong>{formatDuration(route.durationSeconds)}</strong>
            <span>
              {formatDistance(route.distanceMetres)} to {destination.title}
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => select(destination)}
          >
            Details
          </button>
          <button
            className="icon-button"
            onClick={clearRoute}
            aria-label="Clear route"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Selected place card */}
      {selected && (
        <div className="map-card" role="dialog" aria-label={selected.title}>
          <button
            className="map-card-close"
            onClick={() => select(null)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div className="map-card-head">
            <i style={{ background: colorFor(selected.category) }} />
            <div>
              <Badge tone="neutral">{campusName(selected.campus)}</Badge>
              <h2>{selected.title}</h2>
              <small>{selected.category}</small>
            </div>
          </div>
          <p>{selected.body}</p>
          {dest && (
            <div className="map-card-actions">
              <button
                className="btn btn-primary"
                onClick={directions}
                disabled={routing}
              >
                <Footprints size={15} />
                {routing
                  ? "Finding a walking route…"
                  : route
                    ? "Re-route"
                    : "Walking directions"}
              </button>
              <a
                className="btn"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${dest[1]},${dest[0]}&travelmode=walking`}
              >
                <ExternalLink size={14} /> Google Maps
              </a>
            </div>
          )}
          {route && (
            <div className="map-eta" aria-live="polite">
              <strong>{formatDuration(route.durationSeconds)}</strong>
              <span>
                {formatDistance(route.distanceMetres)} walk from {origin?.name}
                {route.source === "estimate" && " · straight-line estimate"}
              </span>
            </div>
          )}
          {locateError && <p className="muted-note">{locateError}</p>}
          <Source item={selected} />
        </div>
      )}
    </div>
  );
}
