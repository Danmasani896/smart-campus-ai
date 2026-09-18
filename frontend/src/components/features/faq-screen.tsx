"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  MessageCircleQuestion,
  Search,
  Sparkles,
} from "lucide-react";
import { useCampus, useFilteredContent } from "../providers";
import { EmptyState, ErrorNotice, Loading } from "../ui";

export function FaqScreen() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState("All topics");
  const [expanded, setExpanded] = useState<string | null>(params.get("id"));
  const { loading, error } = useCampus();
  const faqs = useFilteredContent().filter((item) => item.kind === "faq").sort((a,b) => {
    const selected = params.get('id');
    if (a.id === selected) return -1;
    if (b.id === selected) return 1;
    return a.id.localeCompare(b.id, undefined, {numeric:true});
  });
  const categories = [
    "All topics",
    ...new Set(faqs.map((item) => item.category)),
  ];
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visible = faqs.filter(
    (item) =>
      (category === "All topics" || item.category === category) &&
      words.every((word) =>
        `${item.title} ${item.body} ${item.category}`
          .toLowerCase()
          .includes(word),
      ),
  );
  return (
    <div className="page faq-page">
      <section className="faq-hero">
        <div>
          <p className="eyebrow">LESS GUESSWORK. MORE CAMPUS LIFE.</p>
          <h1>
            Your questions.
            <br />
            <span>Clear answers.</span>
          </h1>
          <p>
            From applications to everyday student life. Find guidance from BUK’s
            official FAQs.
          </p>
        </div>
        <MessageCircleQuestion
          className="faq-hero-icon"
          size={112}
          strokeWidth={1.2}
          aria-hidden="true"
        />
        <label className="faq-search">
          <Search size={20} />
          <input
            aria-label="Search FAQs"
            placeholder="Try admission, school fees or hostels…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} type="button">
              Clear
            </button>
          )}
        </label>
      </section>
      {error && <ErrorNotice message={error} />}
      <div className="faq-layout">
        <aside className="faq-topics" aria-label="FAQ topics">
          <p className="eyebrow">EXPLORE A TOPIC</p>
          {categories.map((topic) => (
            <button
              type="button"
              key={topic}
              aria-pressed={category === topic}
              onClick={() => setCategory(topic)}
            >
              {topic}
              <span>
                {topic === "All topics"
                  ? faqs.length
                  : faqs.filter((f) => f.category === topic).length}
              </span>
            </button>
          ))}
          <div className="faq-help">
            <Sparkles size={22} />
            <h3>A little more guidance?</h3>
            <p>Ask Campus AI to help you find the right information.</p>
            <Link href="/chat">
              Start a conversation <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
        <section aria-label="Frequently asked questions">
          <div className="faq-results">
            <h2>{category}</h2>
            <span role="status">
              {visible.length} {visible.length === 1 ? "answer" : "answers"}
            </span>
          </div>
          {loading ? (
            <Loading />
          ) : !visible.length ? (
            <EmptyState
              title="No matching questions"
              description="Try another phrase or choose a different topic."
            />
          ) : (
            visible.map((item) => (
              <article className="faq-item" key={item.id}>
                <h3>
                  <button
                    id={`question-${item.id}`}
                    aria-expanded={expanded === item.id}
                    aria-controls={`answer-${item.id}`}
                    onClick={() =>
                      setExpanded(expanded === item.id ? null : item.id)
                    }
                  >
                    <span>
                      <small>{item.category}</small>
                      {item.title}
                    </span>
                    <ChevronDown size={20} />
                  </button>
                </h3>
                <div
                  id={`answer-${item.id}`}
                  role="region"
                  aria-labelledby={`question-${item.id}`}
                  hidden={expanded !== item.id}
                  className="faq-answer"
                >
                  <p>{item.body}</p>
                  <div className="faq-answer-links">
                    {item.sourceUrl && (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        Read the official BUK answer <ArrowUpRight size={14} />
                      </a>
                    )}
                    <Link href={`/chat?q=${encodeURIComponent(item.title)}`}>
                      Ask Campus AI <Sparkles size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
          <p className="faq-source-note">
            Summarised from BUK’s official FAQ pages. Check the linked source
            and current university announcements for session-specific
            requirements.
          </p>
        </section>
      </div>
    </div>
  );
}
