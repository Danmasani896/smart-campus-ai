"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { useCampus, useFilteredContent } from "../providers";
import { api } from "@/lib/api";
import { Badge, Card, ErrorNotice, PageHeading } from "../ui";
import { Source } from "./content-screens";
const tasks = [
  {
    id: "prepare",
    title: "Get ready before you arrive",
    body: "Gather your admission documents and make a list of questions to confirm with your faculty. Keep copies of important documents. Check published university instructions for the current requirements.",
  },
  {
    id: "registration",
    title: "Understand your registration steps",
    body: "Confirm the current registration process, deadlines and approved portal with the university. Do not make payments based on informal messages.",
  },
  {
    id: "faculty",
    title: "Find your faculty and department",
    body: "Use the campus map and confirm whether your destination is on Old Campus or New Campus. Ask your department where your lectures will take place.",
  },
  {
    id: "courses",
    title: "Get familiar with course registration",
    body: "Speak to your departmental adviser about your course list and follow the approved registration instructions.",
  },
  {
    id: "library",
    title: "Discover your student services",
    body: "Find out how to access library services, student affairs, medical support and accommodation information through verified university channels.",
  },
  {
    id: "safety",
    title: "Know where to get help",
    body: "Review the verified emergency directory and identify a staffed security post near your regular buildings. Keep trusted contact details accessible.",
  },
];
export function GuideScreen() {
  const { user } = useCampus(),
    guides = useFilteredContent().filter((c) => c.kind === "guide"),
    [done, setDone] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setDone([]);
    if (user)
      api<{ taskId: string }[]>("/checklist")
        .then((r) => setDone(r.map((x) => x.taskId)))
        .catch((e) => setError(e.message));
  }, [user]);
  async function toggle(id: string) {
    setError("");
    if (!user) {
      setError("Sign in to save your checklist progress.");
      return;
    }
    setBusy(true);
    try {
      await api(`/checklist/${id}`, {
        method: done.includes(id) ? "DELETE" : "PUT",
      });
      setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="YOUR FIRST CHAPTER AT BUK"
        title="A fresh start, a little guidance"
        description="One step at a time. You don’t have to figure it all out today."
      />
      {error && <ErrorNotice message={error} />}
      <div className="guide-layout">
        <div>
          <Card>
            <div className="flex items-center justify-between">
              <h2>Your settling-in checklist</h2>
              <Badge tone="neutral">6 first steps</Badge>
            </div>
            <p className="muted-note mt-2">
              General preparation prompts. Use reviewed university guidance
              below for official procedures.
            </p>
            {tasks.map((task, i) => (
              <div className="checklist-row" key={task.id}>
                <button
                  className={`check-button ${done.includes(task.id) ? "complete" : ""}`}
                  disabled={busy}
                  aria-label={`${done.includes(task.id) ? "Uncheck" : "Complete"} ${task.title}`}
                  aria-pressed={done.includes(task.id)}
                  onClick={() => void toggle(task.id)}
                >
                  {done.includes(task.id) ? (
                    <Check size={15} />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </button>
                <details>
                  <summary>{task.title}</summary>
                  <p>{task.body}</p>
                  <Link
                    className="source-link"
                    href={`/chat?q=${encodeURIComponent(task.title)}`}
                  >
                    <Sparkles size={12} /> Ask Campus AI about this step
                  </Link>
                </details>
              </div>
            ))}
          </Card>
          {guides.map((guide) => (
            <Card className="mt-5 content-card" key={guide.id}>
              <Badge>Reviewed guidance</Badge>
              <h2>{guide.title}</h2>
              <p>{guide.body}</p>
              <Source item={guide} />
            </Card>
          ))}
        </div>
        <aside className="stack">
          <Card>
            <GraduationCap size={29} className="text-brand mb-3" />
            <h3>You’re making yourself at home.</h3>
            <p className="muted-note mt-2">
              {done.length} of {tasks.length} steps completed
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Orientation progress"
              aria-valuenow={done.length}
              aria-valuemin={0}
              aria-valuemax={tasks.length}
            >
              <span
                style={{ width: `${(done.length / tasks.length) * 100}%` }}
              />
            </div>
            {!user && (
              <Link href="/profile" className="source-link">
                Sign in to save your progress →
              </Link>
            )}
          </Card>
          <div className="notice-card">
            <ShieldCheck size={20} className="mb-2" />
            <strong>Your sources matter.</strong>
            <p className="mt-2">
              Registration dates, payment instructions and emergency numbers
              should always come from verified university channels.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
