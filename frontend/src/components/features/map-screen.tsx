"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useCampus, useFilteredContent } from "../providers";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
} from "../ui";
import { campusName, type CampusContent } from "@/lib/types";
import { Source } from "./content-screens";
const CampusMap = dynamic(() => import("./campus-map"), {
  ssr: false,
  loading: () => <Loading />,
});
export function MapScreen() {
  const all = useFilteredContent().filter((c) =>
      ["location", "faculty", "department"].includes(c.kind),
    ),
    { loading, error, campus } = useCampus(),
    params = useSearchParams(),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<CampusContent | null>(null);
  const items = all.filter((c) =>
    `${c.title} ${c.body} ${c.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const availableIds = all.map((c) => c.id).join(",");
  useEffect(() => {
    setSelected(all.find((c) => c.id === params.get("id")) || null);
  }, [campus, params, availableIds]);
  const current = (selected && items.find((i) => i.id === selected.id)) || null;
  return (
    <div className="page">
      <PageHeading
        eyebrow="GET TO KNOW YOUR SURROUNDINGS"
        title="Find your place at BUK"
        description="Explore buildings and facilities across Old and New Campuses."
        action={<Badge tone="neutral">Outdoor navigation</Badge>}
      />
      {error && <ErrorNotice message={error} />}
      <div className="map-layout">
        <div className="map-sidebar">
          <input
            className="input"
            aria-label="Find a campus location"
            placeholder="Search buildings or facilities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="muted-note">
            {items.length} verified places · {campusName(campus)}
          </p>
          {loading ? (
            <Loading />
          ) : (
            <div className="location-list">
              {items.length ? (
                items.map((item) => (
                  <button
                    key={item.id}
                    className={`location-button ${current?.id === item.id ? "selected" : ""}`}
                    onClick={() => setSelected(item)}
                  >
                    <MapPin size={14} className="inline mr-2" />
                    {item.title}
                    <small>
                      {campusName(item.campus)} · {item.category}
                    </small>
                    {item.latitude == null && (
                      <small>Coordinates awaiting verification</small>
                    )}
                  </button>
                ))
              ) : (
                <EmptyState
                  title="Places are being verified"
                  description="Approved buildings will appear here once the university team publishes them. No campus coordinates are guessed."
                />
              )}
            </div>
          )}
        </div>
        <div className="map-pane">
          <CampusMap items={items} selected={current} onSelect={setSelected} />
          {!items.some((i) => i.latitude != null) && (
            <div className="map-note">
              Regional map view · Verified campus markers will appear when
              published.
            </div>
          )}
        </div>
      </div>
      {current && (
        <Card className="mt-5 content-card">
          <Badge>{campusName(current.campus)}</Badge>
          <h2>{current.title}</h2>
          <p>{current.body}</p>
          {current.latitude != null && current.longitude != null && (
            <a
              className="btn btn-primary mt-4"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${current.latitude},${current.longitude}&travelmode=walking`}
            >
              <Navigation size={15} /> Get walking directions
            </a>
          )}
          <Source item={current} />
        </Card>
      )}
      <p className="muted-note mt-4">
        Directions open in an external map service. Building entrances and
        indoor room navigation are outside this project’s scope.
      </p>
    </div>
  );
}
