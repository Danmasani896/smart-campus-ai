"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ChatAnswer } from "@/lib/types";
import { useCampus } from "../providers";
import { Badge, Button, ErrorNotice, PageHeading } from "../ui";
type Message = {
  role: "user" | "assistant";
  text: string;
  response?: ChatAnswer;
};
export function ChatScreen() {
  const { campus } = useCampus(),
    params = useSearchParams(),
    initial = params.get("q"),
    [input, setInput] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    started = useRef(false),
    bottom = useRef<HTMLDivElement>(null);
  async function send(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    try {
      const response = await api<ChatAnswer>("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: question,
          campus,
          previousQuestions: messages
            .filter((m) => m.role === "user")
            .slice(-6)
            .map((m) => m.text),
        }),
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: response.answer, response },
      ]);
    } catch (e) {
      setError((e as Error).message);
      setInput(question);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (initial && !started.current) {
      started.current = true;
      void send(initial);
    }
  }, [initial]); // First query is consumed once per page visit.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);
  return (
    <div className="page">
      <PageHeading
        eyebrow="A LITTLE CLARITY GOES A LONG WAY"
        title="Campus AI"
        description="Your questions. Your campus. Answers with a source."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setMessages([]);
              setError("");
            }}
            disabled={busy}
          >
            <Plus size={15} /> New chat
          </Button>
        }
      />
      <div className="chat-layout">
        {!messages.length && (
          <div className="chat-welcome">
            <span className="ai-orb">
              <Sparkles size={26} />
            </span>
            <h2>Let’s figure it out together.</h2>
            <p>
              Find a place, understand a process, or get ready for your first
              day.
            </p>
            <div className="prompt-grid">
              {[
                "How do I complete course registration?",
                "Where is the Faculty of Computing?",
                "What should I do as a newly admitted student?",
                "What events are coming up?",
              ].map((q) => (
                <button key={q} onClick={() => void send(q)}>
                  {q}
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="messages" aria-live="polite" aria-busy={busy}>
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.role === "assistant" && (
                <div className="message-label">
                  <Sparkles size={16} /> Campus AI{" "}
                  <Badge tone="neutral">
                    {m.response?.mode === "generated"
                      ? "AI-assisted"
                      : "Source-first"}
                  </Badge>
                </div>
              )}
              <div className={m.role === "assistant" ? "message-body" : ""}>
                {m.text}
              </div>
              {m.response?.notice && (
                <p className="muted-note mt-2">{m.response.notice}</p>
              )}
              {!!m.response?.sources.length && (
                <div className="sources">
                  {m.response.sources.map((s) => (
                    <a
                      className="source-card"
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ShieldCheck size={12} className="inline mr-1" />
                      {s.title}
                      <small>
                        Source ·{" "}
                        {s.updatedAt
                          ? new Date(s.updatedAt).toLocaleDateString("en-GB")
                          : ""}
                      </small>
                    </a>
                  ))}
                </div>
              )}
              {!!m.response?.actions?.length && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {m.response.actions.map((a, j) => (
                    <Link className="btn btn-secondary" key={j} href={a.href}>
                      {a.label}
                      <ArrowUpRight size={13} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="message-label text-muted">
              <Sparkles size={16} className="animate-pulse" /> Looking through
              the available sources…
            </div>
          )}
          <div ref={bottom} />
        </div>
        {error && <ErrorNotice message={error} />}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            aria-label="Your message"
            placeholder="What would you like to know about BUK?"
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <div className="composer-bottom">
            <Link href="/documents">
              <BookOpen size={15} /> Ask about a document
            </Link>
            <Button disabled={busy || input.trim().length < 2} type="submit">
              Send <ArrowRight size={15} />
            </Button>
          </div>
        </form>
        <p className="chat-disclaimer">
          Campus AI uses approved information. If a source is missing, it will
          tell you.
        </p>
      </div>
    </div>
  );
}
