"use client";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  CAMPUS_VIEWS,
  colorFor,
  toLngLat,
  type CampusMapProps,
  type LngLat,
} from "@/lib/map";
const ll = (p: LngLat): [number, number] => [p[1], p[0]];
function Camera({ selected, campus, route }: CampusMapProps) {
  const map = useMap();
  useEffect(() => {
    if (route?.coordinates.length) {
      map.flyToBounds(route.coordinates.map(ll), {
        paddingTopLeft: [360, 110],
        paddingBottomRight: [60, 190],
        duration: 1.4,
      });
      return;
    }
    const at = selected && toLngLat(selected);
    if (at) map.flyTo(ll(at), 17, { duration: 1.4 });
    else {
      const view =
        CAMPUS_VIEWS[campus as keyof typeof CAMPUS_VIEWS] || CAMPUS_VIEWS.all;
      map.flyTo(ll(view.center), view.zoom, { duration: 1.4 });
    }
  }, [selected, campus, route, map]);
  return null;
}
// OpenStreetMap fallback used when no Mapbox token or Google key is configured.
export default function LeafletCampusMap(props: CampusMapProps) {
  const { items, selected, onSelect, route, origin, userLocation } = props;
  const view = CAMPUS_VIEWS.all;
  return (
    <MapContainer
      className="map-canvas"
      center={ll(view.center)}
      zoom={view.zoom}
      zoomControl
      scrollWheelZoom
    >
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
      <Camera {...props} />
      {route && (
        <Polyline
          positions={route.coordinates.map(ll)}
          pathOptions={{
            color: "#315efb",
            weight: 5,
            dashArray: route.source === "estimate" ? "2 10" : undefined,
          }}
        />
      )}
      {origin && route && (
        <CircleMarker
          center={ll(origin.at)}
          radius={7}
          pathOptions={{
            color: "#fff",
            weight: 3,
            fillColor: "#16a34a",
            fillOpacity: 1,
          }}
        >
          <Tooltip permanent direction="top">
            {origin.name}
          </Tooltip>
        </CircleMarker>
      )}
      {userLocation && (
        <CircleMarker
          center={ll(userLocation)}
          radius={8}
          pathOptions={{
            color: "#fff",
            weight: 3,
            fillColor: "#315efb",
            fillOpacity: 1,
          }}
        />
      )}
      {items.map((item) => {
        const at = toLngLat(item);
        if (!at) return null;
        const active = selected?.id === item.id;
        return (
          <CircleMarker
            key={item.id}
            center={ll(at)}
            radius={active ? 11 : 8}
            pathOptions={{
              color: "#fff",
              weight: 3,
              fillColor: colorFor(item.category),
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(item) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {item.title}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
