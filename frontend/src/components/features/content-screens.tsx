"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCampus, useFilteredContent } from "../providers";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
} from "../ui";
import { campusName, contentHref, type CampusContent } from "@/lib/types";
export function Source({ item }: { item: CampusContent }) {
  return item.sourceUrl ? (
    <a
      href={item.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="source-link"
    >
      <ShieldCheck size={12} />
      {item.sourceLabel || "University source"} · Reviewed{" "}
      {new Date(item.verifiedAt || item.updatedAt).toLocaleDateString("en-GB")}
      <ExternalLink size={11} />
    </a>
  ) : null;
}
export function EventsScreen() {
  const content = useFilteredContent(),
    { loading, error, live } = useCampus(),
    [category, setCategory] = useState("All"),
    [past, setPast] = useState(false),
    params = useSearchParams(),
    selected = params.get("id");
  const all = content.filter((c) => ["event", "announcement"].includes(c.kind));
  const categories = ["All", ...new Set(all.map((c) => c.category))];
  const items = all
    .filter(
      (c) =>
        (category === "All" || c.category === category) &&
        (past || !c.startsAt || new Date(c.startsAt) >= new Date()),
    )
    .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));
  return (
    <div className="page">
      <PageHeading
        eyebrow="STAY IN THE LOOP"
        title="Around campus"
        description="The moments, announcements and dates that matter."
        action={
          <Badge tone={live ? "green" : "amber"}>
            <span className="status-dot" />
            {live ? "Live updates connected" : "Connecting to updates"}
          </Badge>
        }
      />
      {error && <ErrorNotice message={error} />}
      <div className="filter-row">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`filter-chip ${category === c ? "selected" : ""}`}
          >
            {c}
          </button>
        ))}
        <label className="muted-note ml-auto">
          <input
            type="checkbox"
            checked={past}
            onChange={(e) => setPast(e.target.checked)}
          />{" "}
          Include past events
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : !items.length ? (
        <Card>
          <EmptyState
            title="Your campus calendar is getting ready"
            description="Published university events and announcements will appear here. Keep this page open to receive updates as they are published."
          />
        </Card>
      ) : (
        <div className="content-grid">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`content-card ${selected === item.id ? "ring-2 ring-brand" : ""}`}
            >
              <div className="flex justify-between">
                <Badge>{item.category}</Badge>
                <Badge tone="neutral">{campusName(item.campus)}</Badge>
              </div>
              <h2>{item.title}</h2>
              {item.startsAt && (
                <div className="card-meta">
                  <CalendarDays size={15} />
                  {new Date(item.startsAt).toLocaleString("en-GB", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  WAT
                </div>
              )}
              {item.venue && (
                <div className="card-meta">
                  <MapPin size={15} />
                  {item.venue}
                </div>
              )}
              <p>{item.body}</p>
              <Source item={item} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
export function EmergencyScreen() {
  const content = useFilteredContent(),
    safetyFaqs = content.filter(
      (c) =>
        c.kind === "faq" && /security issue|medical emergency/i.test(c.title),
    ),
    items = content.filter((c) => c.kind === "emergency" && c.phone),
    { loading, error } = useCampus();
  return (
    <div className="page">
      <PageHeading
        eyebrow="HELP SHOULD NEVER BE HARD TO FIND"
        title="Emergency & safety"
        description="A direct path to verified campus support."
      />
      <div className="emergency-header">
        <ShieldCheck size={30} />
        <div>
          <h3>Need urgent help?</h3>
          <p>
            If you are in immediate danger, seek nearby campus security
            personnel or a staffed university office. This app is not an
            emergency dispatch service.
          </p>
        </div>
      </div>
      {error && <ErrorNotice message={error} />}{" "}
      {safetyFaqs.length > 0 && (
        <div className="content-grid mb-6">
          {safetyFaqs.map((item) => (
            <Card className="content-card" key={item.id}>
              <Badge>Official BUK FAQ</Badge>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <Source item={item} />
              <Link className="source-link" href={`/faq?id=${item.id}`}>
                Read FAQ <ExternalLink size={13} />
              </Link>
            </Card>
          ))}
        </div>
      )}
      {loading ? (
        <Loading />
      ) : !items.length ? (
        <Card>
          <EmptyState
            title="Additional directory contacts are awaiting review"
            description="Further security, medical and student welfare directory entries will appear after university review."
          />
        </Card>
      ) : (
        <div className="content-grid">
          {items.map((item) => (
            <Card className="content-card" key={item.id}>
              <Badge>{campusName(item.campus)}</Badge>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <a
                className="btn btn-primary mt-5"
                href={`tel:${item.phone!.replace(/[^+\d]/g, "")}`}
              >
                <Phone size={16} />
                {item.phone}
              </a>
              <Source item={item} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
export function SearchScreen() {
  const params = useSearchParams(),
    [query, setQuery] = useState(params.get("q") || ""),
    items = useFilteredContent(),
    { loading, error } = useCampus(),
    selected = params.get("id");
  const results = items.filter((c) =>
    selected
      ? c.id === selected
      : query.trim() &&
        `${c.title} ${c.body} ${c.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeading
        eyebrow="LESS SEARCHING. MORE FINDING."
        title="Search your campus"
        description="Places, guides, events and official information, together."
      />
      <label className="flex items-center gap-3 mb-6">
        <Search size={19} />
        <input
          className="input"
          aria-label="Search all university content"
          placeholder="Try registration, library, or orientation…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {error && <ErrorNotice message={error} />}{" "}
      {loading ? (
        <Loading />
      ) : !results.length ? (
        <Card>
          <EmptyState
            title={
              query ? "No verified results found" : "What are you looking for?"
            }
            description={
              query
                ? "Try a different search or select both campuses. Only published, verified information is searched."
                : "Enter a place, topic, office or event to search across your campus."
            }
          />
        </Card>
      ) : (
        <div className="search-results">
          {[...new Set(results.map((r) => r.kind))].map((kind) => (
            <Card key={kind}>
              <p className="eyebrow">
                {kind.toUpperCase()} ·{" "}
                {results.filter((r) => r.kind === kind).length}
              </p>
              {results
                .filter((r) => r.kind === kind)
                .map((item) => (
                  <div className="search-result" key={item.id}>
                    <Badge tone="neutral">{campusName(item.campus)}</Badge>
                    <h3>
                      <Link href={contentHref(item)}>{item.title}</Link>
                    </h3>
                    <p>{selected ? item.body : item.body.slice(0, 260)}</p>
                    <Source item={item} />
                  </div>
                ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
