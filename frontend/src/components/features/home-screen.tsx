"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Compass,
  FileText,
  GraduationCap,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCampus, useFilteredContent } from "../providers";
import { Badge, Card, ErrorNotice } from "../ui";
import { CampusCarousel } from "./campus-carousel";
import { campusName } from "@/lib/types";
export function HomeScreen() {
  const router = useRouter(),
    [question, setQuestion] = useState(""),
    { user, error } = useCampus(),
    content = useFilteredContent();
  const events = content
    .filter(
      (c) =>
        c.kind === "event" && c.startsAt && new Date(c.startsAt) >= new Date(),
    )
    .sort((a, b) => a.startsAt!.localeCompare(b.startsAt!))
    .slice(0, 2);
  const announcement = content.find((c) => c.kind === "announcement");
  const prompts = [
    "How do I register my courses?",
    "Help me find my faculty",
    "What should I do as a fresher?",
  ];
  return (
    <div className="page home-page">
      <div className="home-greeting">
        <div>
          <p className="eyebrow">YOUR EVERYDAY CAMPUS COMPANION</p>
          <h1>
            A smarter way to campus<span className="brand-period">.</span>
          </h1>
          <p>
            Welcome{user ? `, ${user.name.split(" ")[0]}` : ""}. A little less
            searching, a little more student life.
          </p>
        </div>
        <span className="semester-label">
          <span className="status-dot" /> Old & New Campus
        </span>
      </div>
      {error && <ErrorNotice message={error} />}
      <section className="ask-hero">
        <div className="hero-copy">
          <span className="hero-label">
            <Sparkles size={15} /> MEET YOUR CAMPUS AI
          </span>
          <h2>
            Big campus.
            <br />{" "}Small questions.
            <br />
            <em>We’re here for both.</em>
          </h2>
          <p>
            From your first lecture to finding your way.
            <br />
            Ask naturally. Get the guidance you need.
          </p>
          <span className="hero-trust">
            <ShieldCheck size={14} /> University information, with sources.
          </span>
        </div>
        <div className="hero-interaction">
          <div className="assistant-intro">
            <span className="ai-orb">
              <Sparkles size={22} />
            </span>
            <div>
              <strong>What can I help you with?</strong>
              <p>Ask me anything about life at BUK.</p>
            </div>
            <span className="online-dot" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim())
                router.push(`/chat?q=${encodeURIComponent(question)}`);
            }}
          >
            <textarea
              aria-label="Ask Campus AI"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Where do I begin with course registration?"
              maxLength={2000}
            />
            <div className="composer-bottom">
              <Link href="/documents">
                <FileText size={15} /> Add a document
              </Link>
              <button
                type="submit"
                className="send-button"
                disabled={!question.trim()}
                aria-label="Send question"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
          <div className="try-label">A FEW THINGS YOU CAN ASK</div>
          <div className="suggestions">
            {prompts.map((p) => (
              <Link href={`/chat?q=${encodeURIComponent(p)}`} key={p}>
                {p}
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CampusCarousel />
      <div className="section-heading">
        <h2>Make yourself at home</h2>
        <span>Your essentials, one place.</span>
      </div>
      <div className="shortcut-grid">
        {[
          {
            title: "Find your way",
            body: "Buildings, faculties & familiar places.",
            href: "/map",
            icon: Compass,
            color: "sage",
          },
          {
            title: "Your first steps",
            body: "A little guidance for a fresh start.",
            href: "/guide",
            icon: GraduationCap,
            color: "sand",
          },
          {
            title: "Study a little smarter",
            body: "Turn your documents into understanding.",
            href: "/documents",
            icon: BookOpen,
            color: "lavender",
          },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="shortcut-card">
            <span className={`shortcut-icon ${c.color}`}>
              <c.icon size={23} />
            </span>
            <ArrowUpRight className="shortcut-arrow" size={18} />
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </Link>
        ))}
      </div>
      <Link href="/faq" className="faq-home-banner">
        <span className="ai-orb">
          <Sparkles size={22} />
        </span>
        <span>
          <strong>Good questions deserve clear answers.</strong>
          <small>
            Explore BUK FAQs on admissions, fees, hostels and student life.
          </small>
        </span>
        <span className="faq-home-action">
          Explore FAQs <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="home-lower">
        <Card className="events-preview">
          <div className="section-heading">
            <h2>
              <CalendarDays size={18} /> Around campus
            </h2>
            <Link href="/events">
              All updates <ArrowUpRight size={14} />
            </Link>
          </div>
          {events.length ? (
            events.map((e) => (
              <Link
                className="event-row"
                key={e.id}
                href={`/events?id=${e.id}`}
              >
                <div className="date-tile">
                  <small>
                    {new Date(e.startsAt!).toLocaleDateString("en", {
                      month: "short",
                    })}
                  </small>
                  <strong>{new Date(e.startsAt!).getDate()}</strong>
                </div>
                <div>
                  <Badge tone="neutral">{e.category}</Badge>
                  <h3>{e.title}</h3>
                  <p>
                    <MapPin size={13} />
                    {e.venue || campusName(e.campus)}
                  </p>
                </div>
                <ArrowUpRight size={17} />
              </Link>
            ))
          ) : (
            <div className="quiet-events">
              <span className="calendar-illustration">
                <CalendarDays size={30} />
              </span>
              <div>
                <h3>A little quiet on the calendar.</h3>
                <p>
                  Verified events will appear here as soon as
                  <br className="desktop-break" /> the university team publishes
                  them.
                </p>
                <Link href="/events">
                  Explore campus updates <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
          {announcement && (
            <div className="announcement-strip">
              <strong>{announcement.title}</strong>
              <p>{announcement.body.slice(0, 160)}</p>
            </div>
          )}
        </Card>
        <section className="fresher-feature">
          <span className="fresher-tag">NEW HERE?</span>
          <GraduationCap className="fresher-art" size={86} strokeWidth={1} />
          <h2>
            Every journey starts
            <br />
            with a first step.
          </h2>
          <p>
            Your fresher guide makes the unfamiliar
            <br />
            feel a little more familiar.
          </p>
          <Link href="/guide">
            Let’s get you settled <ArrowRight size={17} />
          </Link>
        </section>
      </div>
      <div className="safety-strip">
        <ShieldCheck size={19} />
        <p>
          A helping hand, when it matters most.{" "}
          <span>Keep campus safety close.</span>
        </p>
        <Link href="/emergency">
          Emergency directory <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
