"use client";
import { useEffect, useRef, useState } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  CAMPUS_VIEWS,
  GOOGLE_MAPS_KEY,
  colorFor,
  toLngLat,
  type CampusMapProps,
  type LngLat,
} from "@/lib/map";

// Advanced (HTML) markers need a Map ID. Google's demo ID renders the default
// style; set NEXT_PUBLIC_GOOGLE_MAP_ID to use a styled map from Cloud Console.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";
const latLng = (p: LngLat) => ({ lat: p[1], lng: p[0] });
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Smooth camera flight (Google only animates short pans natively). */
function flyTo(
  map: google.maps.Map,
  frame: { current: number },
  to: LngLat,
  zoom: number,
  ms = 1400,
) {
  cancelAnimationFrame(frame.current);
  const from = map.getCenter(),
    z0 = map.getZoom();
  if (!from || z0 == null) {
    map.moveCamera({ center: latLng(to), zoom });
    return;
  }
  const start = performance.now(),
    lat0 = from.lat(),
    lng0 = from.lng();
  // Zoom out slightly mid-flight for long hops so the move reads on screen.
  const far = Math.hypot(lat0 - to[1], lng0 - to[0]) > 0.01;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms),
      e = easeOut(t);
    const dip = far ? Math.sin(Math.PI * t) * 1.6 : 0;
    map.moveCamera({
      center: {
        lat: lat0 + (to[1] - lat0) * e,
        lng: lng0 + (to[0] - lng0) * e,
      },
      zoom: z0 + (zoom - z0) * e - dip,
    });
    if (t < 1) frame.current = requestAnimationFrame(step);
  };
  frame.current = requestAnimationFrame(step);
}

function Camera({
  selected,
  campus,
  items,
  route,
  origin,
  userLocation,
}: CampusMapProps) {
  const map = useMap();
  const frame = useRef(0);
  const drawFrame = useRef(0);
  const line = useRef<google.maps.Polyline | null>(null);
  const casing = useRef<google.maps.Polyline | null>(null);
  const originMk = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const userMk = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Selection / campus framing.
  useEffect(() => {
    if (!map) return;
    const at = selected && toLngLat(selected);
    if (at) {
      flyTo(map, frame, at, 18, 1500);
      return;
    }
    if (route) return; // keep the drawn trip in view
    const points = items.map(toLngLat).filter(Boolean) as LngLat[];
    const narrow = map.getDiv().clientWidth < 850;
    if (points.length > 1) {
      const b = new google.maps.LatLngBounds();
      points.forEach((p) => b.extend(latLng(p)));
      map.fitBounds(
        b,
        narrow
          ? { top: 80, bottom: 300, left: 24, right: 24 }
          : { top: 90, bottom: 120, left: 380, right: 70 },
      );
    } else if (points.length === 1) flyTo(map, frame, points[0], 17);
    else {
      const view =
        CAMPUS_VIEWS[campus as keyof typeof CAMPUS_VIEWS] || CAMPUS_VIEWS.all;
      flyTo(map, frame, view.center, view.zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selected, campus, items.length]);

  // Route: casing + line, revealed progressively, then framed.
  useEffect(() => {
    if (!map) return;
    cancelAnimationFrame(drawFrame.current);
    line.current?.setMap(null);
    casing.current?.setMap(null);
    originMk.current && (originMk.current.map = null);
    if (!route) return;
    const coords = route.coordinates;
    const estimate = route.source === "estimate";
    casing.current = new google.maps.Polyline({
      map,
      path: [],
      strokeColor: "#ffffff",
      strokeOpacity: estimate ? 0 : 0.9,
      strokeWeight: 9,
      zIndex: 1,
    });
    line.current = new google.maps.Polyline({
      map,
      path: [],
      strokeColor: "#315efb",
      strokeOpacity: estimate ? 0 : 1,
      strokeWeight: 5,
      zIndex: 2,
      icons: estimate
        ? [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeOpacity: 1,
                strokeColor: "#315efb",
                strokeWeight: 4,
                scale: 3,
              },
              offset: "0",
              repeat: "14px",
            },
          ]
        : undefined,
    });
    const start = performance.now(),
      total = 1300;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      const n = Math.max(2, Math.ceil(coords.length * easeOut(t)));
      const path = coords.slice(0, n).map(latLng);
      casing.current?.setPath(path);
      line.current?.setPath(path);
      if (t < 1) drawFrame.current = requestAnimationFrame(step);
    };
    drawFrame.current = requestAnimationFrame(step);
    if (origin) {
      const el = document.createElement("div");
      el.className = "mk-origin";
      el.innerHTML = `<span></span><b>${origin.name.replace(/</g, "&lt;")}</b>`;
      originMk.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: latLng(origin.at),
        content: el,
        title: origin.name,
      });
    }
    const b = new google.maps.LatLngBounds();
    coords.forEach((p) => b.extend(latLng(p)));
    const narrow = map.getDiv().clientWidth < 850;
    map.fitBounds(
      b,
      narrow
        ? { top: 80, bottom: 330, left: 24, right: 24 }
        : { top: 100, bottom: 290, left: 380, right: 70 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, route]);

  // Live user location.
  useEffect(() => {
    if (!map) return;
    if (!userLocation) {
      userMk.current && (userMk.current.map = null);
      userMk.current = null;
      return;
    }
    if (!userMk.current) {
      const el = document.createElement("div");
      el.className = "mk-user";
      el.innerHTML = "<i></i><span></span>";
      userMk.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: latLng(userLocation),
        content: el,
        title: "You are here",
      });
    } else userMk.current.position = latLng(userLocation);
  }, [map, userLocation]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(drawFrame.current);
      line.current?.setMap(null);
      casing.current?.setMap(null);
    },
    [],
  );
  return null;
}

export default function GoogleCampusMap(props: CampusMapProps) {
  const { items, selected, onSelect, campus } = props;
  const view =
    CAMPUS_VIEWS[campus as keyof typeof CAMPUS_VIEWS] || CAMPUS_VIEWS.all;
  const [loaded, setLoaded] = useState(false);
  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_KEY}
      libraries={["marker"]}
      onLoad={() => setLoaded(true)}
    >
      <Map
        className="map-canvas"
        id="campus-map"
        mapId={MAP_ID}
        defaultCenter={latLng(view.center)}
        defaultZoom={view.zoom}
        disableDefaultUI
        zoomControl
        gestureHandling="greedy"
        clickableIcons={false}
        onClick={() => onSelect(null)}
      >
        {loaded &&
          items.map((item, index) => {
            const at = toLngLat(item);
            if (!at) return null;
            const active = selected?.id === item.id;
            return (
              <AdvancedMarker
                key={item.id}
                position={latLng(at)}
                title={item.title}
                zIndex={active ? 5 : 1}
                onClick={() => onSelect(item)}
              >
                <button
                  type="button"
                  className={`mk ${active ? "is-selected" : ""}`}
                  style={
                    {
                      "--mk": colorFor(item.category),
                      animationDelay: `${Math.min(index * 28, 900)}ms`,
                    } as React.CSSProperties
                  }
                  aria-label={item.title}
                >
                  <span className="mk-dot" />
                  <span className="mk-label">{item.title}</span>
                </button>
              </AdvancedMarker>
            );
          })}
        {loaded && <Camera {...props} />}
      </Map>
    </APIProvider>
  );
}
