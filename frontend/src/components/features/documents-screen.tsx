"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Trash2, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import type { ChatAnswer, PersonalDocument } from "@/lib/types";
import { useCampus } from "../providers";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeading,
} from "../ui";
const tasks = [
  ["summary", "Full summary"],
  ["short", "Short summary"],
  ["points", "Important points"],
  ["explain", "Explain a section"],
  ["revision", "Revision notes"],
  ["questions", "Practice questions"],
  ["concepts", "Key concepts"],
  ["ask", "Ask a question"],
];
export function DocumentsScreen() {
  const { user } = useCampus(),
    [docs, setDocs] = useState<PersonalDocument[]>([]),
    [selected, setSelected] = useState<PersonalDocument | null>(null),
    [task, setTask] = useState("summary"),
    [question, setQuestion] = useState(""),
    [search, setSearch] = useState(""),
    [answer, setAnswer] = useState<ChatAnswer | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false);
  async function refresh() {
    setDocs(await api<PersonalDocument[]>("/documents"));
  }
  useEffect(() => {
    setDocs([]);
    setSelected(null);
    setAnswer(null);
    if (user) void refresh().catch((e) => setError(e.message));
  }, [user]);
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      setSelected(await api<PersonalDocument>(`/documents/${id}`));
      setAnswer(null);
      setSearch("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose a file smaller than 8 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const doc = await api<PersonalDocument>("/documents", {
        method: "POST",
        body,
      });
      await refresh();
      await open(doc.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this private document and its extracted text?"))
      return;
    setBusy(true);
    try {
      await api(`/documents/${id}`, { method: "DELETE" });
      if (selected?.id === id) {
        setSelected(null);
        setAnswer(null);
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function ask() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    try {
      setAnswer(
        await api<ChatAnswer>(`/documents/${selected.id}/ask`, {
          method: "POST",
          body: JSON.stringify({ task, question }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const lines = selected?.text
    ?.split("\n")
    .filter((l) => !search || l.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="page">
      <PageHeading
        eyebrow="FROM READING TO UNDERSTANDING"
        title="Your study companion"
        description="Make sense of lecture notes, one document at a time."
        action={<Badge tone="neutral">Private to your account</Badge>}
      />
      {!user ? (
        <Card>
          <EmptyState
            title="A private space for your academic documents"
            description="Sign in to upload notes, ask questions and generate study aids. Personal files never enter the official university knowledge base."
          >
            <Link className="btn btn-primary" href="/profile">
              Sign in to get started
            </Link>
          </EmptyState>
        </Card>
      ) : (
        <>
          {error && <ErrorNotice message={error} />}
          <div className="document-layout">
            <Card>
              <label className="upload-zone">
                <UploadCloud size={27} />
                <strong>Bring your notes along</strong>
                <small>PDF, DOC, DOCX or TXT · up to 8 MB</small>
                <input
                  disabled={busy}
                  type="file"
                  aria-label="Upload a personal document"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="muted-note mt-3">
                Text-based, unencrypted files only. Scanned PDFs need OCR first.
              </p>
              <div className="mt-4">
                {docs.map((doc) => (
                  <div className="document-item" key={doc.id}>
                    <FileText size={16} />
                    <button disabled={busy} onClick={() => void open(doc.id)}>
                      <strong>{doc.name}</strong>
                      <small>
                        Expires{" "}
                        {new Date(doc.expiresAt).toLocaleString("en-GB")}
                      </small>
                    </button>
                    <button
                      disabled={busy}
                      className="icon-button"
                      aria-label={`Delete ${doc.name}`}
                      onClick={() => void remove(doc.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              {selected ? (
                <div className="stack">
                  <div>
                    <Badge>Personal document</Badge>
                    <h2 className="mt-2 break-all">{selected.name}</h2>
                    <p className="muted-note">
                      Extracted text expires automatically. Delete it at any
                      time.
                    </p>
                  </div>
                  <details>
                    <summary className="text-sm cursor-pointer">
                      Search & read extracted text
                    </summary>
                    <input
                      className="input mt-3"
                      placeholder="Search within this document…"
                      aria-label="Search document text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="document-text">
                      {lines?.join("\n") || "No matching text found."}
                    </div>
                  </details>
                  <label className="field">
                    What would you like to do?
                    <select
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                    >
                      {tasks.map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {["ask", "explain"].includes(task) && (
                    <label className="field">
                      Your question or section
                      <textarea
                        value={question}
                        maxLength={2000}
                        placeholder="What does this section mean?"
                        onChange={(e) => setQuestion(e.target.value)}
                      />
                    </label>
                  )}
                  <label className="muted-note flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1"
                    />{" "}
                    If AI generation is enabled, relevant document excerpts are
                    sent to the configured AI provider. I’m comfortable using
                    this document for that.
                  </label>
                  <Button
                    disabled={
                      busy ||
                      !consent ||
                      (["ask", "explain"].includes(task) && !question.trim())
                    }
                    onClick={() => void ask()}
                  >
                    {busy
                      ? "Working with your document…"
                      : "Work with this document"}
                  </Button>
                  {answer && (
                    <div aria-live="polite">
                      <Badge tone="neutral">
                        {answer.mode === "generated"
                          ? "AI study aid"
                          : "Retrieved document text"}
                      </Badge>
                      <div className="answer-panel mt-3">{answer.answer}</div>
                      {answer.notice && (
                        <p className="muted-note mt-2">{answer.notice}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title={
                    busy ? "Reading your document…" : "A clearer way to study"
                  }
                  description="Choose a document or upload new material to get started. Summaries, revision notes and questions stay grounded in your text."
                />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
