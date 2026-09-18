"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { CampusContent } from "@/lib/types";
import {
  CAMPUS_VIEWS,
  MAPBOX_TOKEN,
  bounds,
  colorFor,
  toLngLat,
  type CampusMapProps,
  type LngLat,
} from "@/lib/map";

const FLY = { duration: 1600, essential: true, curve: 1.42 } as const;
// Keep framed content clear of the floating panel (left on desktop, bottom on phones).
const framePadding = (m: mapboxgl.Map, withCard = false) => {
  const narrow = m.getContainer().clientWidth < 850;
  return narrow
    ? { top: 80, bottom: withCard ? 330 : 300, left: 24, right: 24 }
    : { top: 90, bottom: withCard ? 290 : 120, left: 380, right: 70 };
};
const ROUTE_SOURCE = "walking-route";

function markerElement(item: CampusContent, index: number) {
  // Mapbox positions the outer element with a transform, so the animated
  // button lives inside a plain wrapper and never fights that transform.
  const wrap = document.createElement("div");
  wrap.className = "mk-wrap";
  const el = document.createElement("button");
  el.type = "button";
  el.className = "mk";
  el.style.setProperty("--mk", colorFor(item.category));
  el.style.animationDelay = `${Math.min(index * 28, 900)}ms`;
  el.setAttribute("aria-label", item.title);
  el.innerHTML = `<span class="mk-dot"></span><span class="mk-label">${item.title.replace(/</g, "&lt;")}</span>`;
  wrap.appendChild(el);
  return wrap;
}

export default function MapboxCampusMap({
  items,
  selected,
  onSelect,
  campus,
  route,
  origin,
  userLocation,
}: CampusMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef(new Map<string, mapboxgl.Marker>());
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const originMarker = useRef<mapboxgl.Marker | null>(null);
  const ready = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const drawFrame = useRef(0);
  // Camera moves cancel each other, so anything before "load" is queued.
  const whenReady = (fn: (m: mapboxgl.Map) => void) => {
    const m = map.current;
    if (!m) return;
    if (ready.current) fn(m);
    else m.once("load", () => fn(m));
  };

  // Create the map once.
  useEffect(() => {
    if (!container.current || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const view =
      CAMPUS_VIEWS[campus as keyof typeof CAMPUS_VIEWS] || CAMPUS_VIEWS.all;
    const m = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: view.center,
      zoom: view.zoom - 1.2,
      pitch: 0,
      attributionControl: false,
      cooperativeGestures: false,
      antialias: true,
    });
    m.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    m.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "bottom-right",
    );
    m.on("load", () => {
      // Subtle 3D buildings reveal as the camera gets close.
      const labelLayer = m
        .getStyle()
        ?.layers?.find(
          (l) => l.type === "symbol" && l.layout?.["text-field"],
        )?.id;
      if (!m.getLayer("campus-3d")) {
        m.addLayer(
          {
            id: "campus-3d",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#dfe7fb",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                16.5,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                16.5,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.75,
            },
          },
          labelLayer,
        );
      }
      m.addSource(ROUTE_SOURCE, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });
      m.addLayer({
        id: "route-casing",
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 9,
          "line-opacity": 0.9,
        },
      });
      m.addLayer({
        id: "route-line",
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#315efb", "line-width": 5 },
      });
      ready.current = true;
    });
    m.on("click", (e) => {
      if (!(e.originalEvent.target as HTMLElement).closest(".mk"))
        onSelectRef.current(null);
    });
    map.current = m;
    return () => {
      cancelAnimationFrame(drawFrame.current);
      markers.current.forEach((mk) => mk.remove());
      markers.current.clear();
      m.remove();
      map.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers with items.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const wanted = new Set<string>();
    items.forEach((item, index) => {
      const at = toLngLat(item);
      if (!at) return;
      wanted.add(item.id);
      if (markers.current.has(item.id)) return;
      const el = markerElement(item, index);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(item);
      });
      const mk = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(at)
        .addTo(m);
      markers.current.set(item.id, mk);
    });
    markers.current.forEach((mk, id) => {
      if (!wanted.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    });
  }, [items]);

  // Highlight the selection and fly the camera to it.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk, id) => {
      mk.getElement().firstElementChild?.classList.toggle(
        "is-selected",
        id === selected?.id,
      );
      mk.getElement().style.zIndex = id === selected?.id ? "5" : "1";
    });
    const at = selected && toLngLat(selected);
    if (!at) return;
    whenReady((mm) =>
      mm.flyTo({
        center: at,
        zoom: 17.2,
        pitch: 52,
        bearing: -18,
        offset: [0, -40],
        ...FLY,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Campus switch: frame every visible place on that campus.
  useEffect(() => {
    if (selected) return;
    const points = items.map(toLngLat).filter(Boolean) as LngLat[];
    const view =
      CAMPUS_VIEWS[campus as keyof typeof CAMPUS_VIEWS] || CAMPUS_VIEWS.all;
    whenReady((m) => {
      if (points.length > 1)
        m.fitBounds(bounds(points), {
          padding: framePadding(m),
          maxZoom: 16.2,
          pitch: 0,
          bearing: 0,
          duration: 1500,
          essential: true,
        });
      else if (points.length === 1)
        m.flyTo({
          center: points[0],
          zoom: 16.8,
          pitch: 0,
          bearing: 0,
          offset: [150, 0],
          ...FLY,
        });
      else
        m.flyTo({
          center: view.center,
          zoom: view.zoom,
          pitch: 0,
          bearing: 0,
          ...FLY,
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus, items.length]);

  // Draw the route progressively, then frame it.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      const src = m.getSource(ROUTE_SOURCE) as
        mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      cancelAnimationFrame(drawFrame.current);
      const coords = route?.coordinates || [];
      m.setPaintProperty(
        "route-line",
        "line-dasharray",
        route?.source === "estimate" ? [0.2, 2] : [1, 0],
      );
      if (!coords.length) {
        src.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
        return;
      }
      const start = performance.now(),
        total = 1300;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / total),
          eased = 1 - Math.pow(1 - t, 3);
        const n = Math.max(2, Math.ceil(coords.length * eased));
        src.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords.slice(0, n) },
        });
        if (t < 1) drawFrame.current = requestAnimationFrame(step);
      };
      drawFrame.current = requestAnimationFrame(step);
      m.fitBounds(bounds(coords), {
        padding: framePadding(m, true),
        pitch: 35,
        bearing: 0,
        duration: 1500,
        essential: true,
        maxZoom: 17,
      });
    };
    whenReady(apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // Origin + live user location markers.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    originMarker.current?.remove();
    originMarker.current = null;
    if (origin && route) {
      const el = document.createElement("div");
      el.className = "mk-origin";
      el.innerHTML = `<span></span><b>${origin.name.replace(/</g, "&lt;")}</b>`;
      originMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(origin.at)
        .addTo(m);
    }
  }, [origin, route]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!userLocation) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = "mk-user";
      el.innerHTML = "<i></i><span></span>";
      userMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(userLocation)
        .addTo(m);
    } else userMarker.current.setLngLat(userLocation);
  }, [userLocation]);

  return (
    <div
      ref={container}
      className="map-canvas"
      aria-label="Campus map"
      role="region"
    />
  );
}
