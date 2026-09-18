"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import type { CampusContent } from "@/lib/types";
import { useCampus } from "../providers";
import { AdminUsers } from "./admin-users";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeading,
} from "../ui";
const kinds = [
  "knowledge",
  "faq",
  "location",
  "event",
  "announcement",
  "emergency",
  "guide",
  "faculty",
  "department",
  "campus",
];
type Draft = {
  kind: string;
  title: string;
  body: string;
  campus: string;
  category: string;
  status: string;
  verified: boolean;
  sourceUrl: string;
  sourceLabel: string;
  latitude: string;
  longitude: string;
  phone: string;
  startsAt: string;
  venue: string;
};
const blank: Draft = {
  kind: "knowledge",
  title: "",
  body: "",
  campus: "all",
  category: "General",
  status: "draft",
  verified: false,
  sourceUrl: "",
  sourceLabel: "",
  latitude: "",
  longitude: "",
  phone: "",
  startsAt: "",
  venue: "",
};
export function AdminScreen() {
  const { user, refresh } = useCampus(),
    [items, setItems] = useState<CampusContent[]>([]),
    [id, setId] = useState<string | null>(null),
    [draft, setDraft] = useState<Draft>({ ...blank }),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const field = (key: keyof Draft, value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));
  async function load() {
    setItems(await api<CampusContent[]>("/admin/content"));
  }
  useEffect(() => {
    if (user?.role === "admin") void load().catch((e) => setError(e.message));
  }, [user]);
  function edit(item: CampusContent) {
    setId(item.id);
    setDraft({
      kind: item.kind,
      title: item.title,
      body: item.body,
      campus: item.campus,
      category: item.category,
      status: item.status,
      verified: item.verified,
      sourceUrl: item.sourceUrl || "",
      sourceLabel: item.sourceLabel || "",
      latitude: item.latitude?.toString() || "",
      longitude: item.longitude?.toString() || "",
      phone: item.phone || "",
      startsAt: item.startsAt
        ? new Date(
            new Date(item.startsAt).getTime() -
              new Date(item.startsAt).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
      venue: item.venue || "",
    });
    setMessage("");
    setError("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...draft,
        sourceUrl: draft.sourceUrl || null,
        sourceLabel: draft.sourceLabel || null,
        phone: draft.phone || null,
        venue: draft.venue || null,
        latitude: draft.latitude === "" ? null : Number(draft.latitude),
        longitude: draft.longitude === "" ? null : Number(draft.longitude),
        startsAt: draft.startsAt
          ? new Date(draft.startsAt).toISOString()
          : null,
      };
      const saved = await api<CampusContent>(
        `/admin/content${id ? `/${id}` : ""}`,
        { method: id ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      setId(saved.id);
      await load();
      await refresh();
      setMessage(
        "Content saved. Published changes are now available to students.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !id ||
      !window.confirm(
        "Permanently delete this content? Archive it instead if it may be needed later.",
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/admin/content/${id}`, { method: "DELETE" });
      setId(null);
      setDraft({ ...blank });
      await load();
      await refresh();
      setMessage("Content deleted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const row = await api<CampusContent>("/admin/documents", {
        method: "POST",
        body,
      });
      await load();
      edit(row);
      setMessage(
        "Official document extracted into a draft. Add its source and verify before publishing.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (user?.role !== "admin")
    return (
      <div className="page">
        <PageHeading
          eyebrow="UNIVERSITY WORKSPACE"
          title="Content administration"
          description="A trusted knowledge base starts with reviewed information."
        />
        <Card>
          <EmptyState
            title="Administrator access required"
            description="Sign in with an administrator account. Administrators are provisioned through the backend bootstrap command."
          >
            <Link className="btn btn-primary" href="/profile">
              Go to sign in
            </Link>
          </EmptyState>
        </Card>
      </div>
    );
  return (
    <div className="page">
      <PageHeading
        eyebrow="UNIVERSITY WORKSPACE"
        title="Keep your campus informed"
        description="Create, review and publish the information students rely on."
        action={
          <Button
            onClick={() => {
              setId(null);
              setDraft({ ...blank });
              setMessage("");
            }}
          >
            <Plus size={15} /> New content
          </Button>
        }
      />
      {error && <ErrorNotice message={error} />}{" "}
      {message && (
        <div className="notice-card mb-5" role="status">
          {message}
        </div>
      )}
      <div className="admin-layout">
        <div className="stack">
          <input
            className="input"
            aria-label="Search administrative content"
            placeholder="Search content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            aria-label="Filter content type"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All content types</option>
            {kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <Card className="admin-list p-0">
            {items
              .filter(
                (i) =>
                  (filter === "all" || i.kind === filter) &&
                  i.title.toLowerCase().includes(search.toLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.id}
                  className={`admin-row ${id === item.id ? "selected" : ""}`}
                  onClick={() => edit(item)}
                >
                  <Badge tone={item.status === "published" ? "green" : "amber"}>
                    {item.status}
                  </Badge>
                  <strong>{item.title}</strong>
                  <small>
                    {item.kind} · {item.campus} campus
                  </small>
                </button>
              ))}
          </Card>
          <label className="upload-zone">
            <UploadCloud size={22} />
            <strong>Import institutional document</strong>
            <small>Creates a draft, separate from student uploads.</small>
            <input
              type="file"
              disabled={busy}
              aria-label="Upload official university document"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <Card>
          <h2 className="mb-5">
            {id ? "Edit campus content" : "Create campus content"}
          </h2>
          <form className="form-grid" onSubmit={save}>
            <label className="field">
              Content type
              <select
                value={draft.kind}
                onChange={(e) => field("kind", e.target.value)}
              >
                {kinds.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Campus
              <select
                value={draft.campus}
                onChange={(e) => field("campus", e.target.value)}
              >
                <option value="all">Both campuses</option>
                <option value="new">New Campus</option>
                <option value="old">Old Campus</option>
              </select>
            </label>
            <label className="field full-width">
              Title
              <input
                required
                minLength={3}
                maxLength={160}
                value={draft.title}
                onChange={(e) => field("title", e.target.value)}
              />
            </label>
            <label className="field full-width">
              Content
              <textarea
                required
                minLength={10}
                maxLength={80000}
                rows={8}
                value={draft.body}
                onChange={(e) => field("body", e.target.value)}
              />
            </label>
            <label className="field">
              Category
              <input
                required
                value={draft.category}
                maxLength={60}
                onChange={(e) => field("category", e.target.value)}
              />
            </label>
            <label className="field">
              Publication status
              <select
                value={draft.status}
                onChange={(e) => field("status", e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="field">
              Source label
              <input
                value={draft.sourceLabel}
                maxLength={160}
                onChange={(e) => field("sourceLabel", e.target.value)}
                placeholder="e.g. Student affairs handbook"
              />
            </label>
            <label className="field">
              Official source URL
              <input
                type="url"
                value={draft.sourceUrl}
                onChange={(e) => field("sourceUrl", e.target.value)}
                placeholder="https://…"
              />
            </label>
            {["location", "faculty", "department"].includes(draft.kind) && (
              <>
                <label className="field">
                  Verified latitude
                  <input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={draft.latitude}
                    onChange={(e) => field("latitude", e.target.value)}
                  />
                </label>
                <label className="field">
                  Verified longitude
                  <input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={draft.longitude}
                    onChange={(e) => field("longitude", e.target.value)}
                  />
                </label>
              </>
            )}
            {draft.kind === "emergency" && (
              <label className="field full-width">
                Verified phone number
                <input
                  value={draft.phone}
                  maxLength={24}
                  onChange={(e) => field("phone", e.target.value)}
                  placeholder="Enter only a verified contact"
                />
              </label>
            )}
            {draft.kind === "event" && (
              <>
                <label className="field">
                  Event start (your local time)
                  <input
                    type="datetime-local"
                    value={draft.startsAt}
                    onChange={(e) => field("startsAt", e.target.value)}
                  />
                </label>
                <label className="field">
                  Venue
                  <input
                    value={draft.venue}
                    onChange={(e) => field("venue", e.target.value)}
                  />
                </label>
              </>
            )}
            <label className="muted-note full-width flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.verified}
                onChange={(e) => field("verified", e.target.checked)}
              />{" "}
              I have checked this information against the stated university
              source. Publishing requires verification and a source.
            </label>
            <div className="full-width flex justify-between gap-3">
              <Button type="submit" disabled={busy}>
                <Save size={14} />
                {busy ? "Saving…" : "Save content"}
              </Button>
              {id && (
                <Button
                  variant="danger"
                  type="button"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
      <AdminUsers />
    </div>
  );
}
