"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  Home,
  Map,
  Menu,
  MessageSquare,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  Bell,
  Settings2,
  Leaf,
} from "lucide-react";
import { useCampus } from "../providers";
import { cn } from "../ui";
import type { Campus } from "@/lib/types";
const nav = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/chat", label: "Campus AI", icon: Sparkles },
  { href: "/faq", label: "Questions & answers", icon: MessageCircleQuestion },
  { href: "/map", label: "Campus map", icon: Map },
  { href: "/events", label: "Events & updates", icon: CalendarDays },
  { href: "/guide", label: "Fresher guide", icon: GraduationCap },
  { href: "/documents", label: "My documents", icon: BookOpen },
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter(),
    { campus, setCampus, user, notice, dismissNotice } = useCampus();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const drawer = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    drawer.current?.querySelector<HTMLElement>("button,a")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key === "Tab") {
        const els = drawer.current?.querySelectorAll<HTMLElement>("a,button");
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={drawer}
        className={cn("sidebar", open && "is-open")}
        aria-label="Main navigation"
      >
        <Link href="/" className="brand">
          <span className="brand-icon">
            <GraduationCap size={25} />
          </span>
          <span>
            smartcampus
            <span className="brand-sub">BAYERO UNIVERSITY, KANO</span>
          </span>
        </Link>
        <button
          className="mobile-close"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <div className="workspace-label">
          <span className="status-dot" /> YOUR CAMPUS COMPANION
        </div>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", pathname === item.href && "active")}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <item.icon size={19} />
              {item.label}
              {item.href === "/chat" && <span className="nav-ai">AI</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={22} />
          <h3>
            A little guidance.
            <br />A better campus day.
          </h3>
          <p>
            Find your way, get answers,
            <br />
            and make yourself at home.
          </p>
          <Link href="/guide">
            Start your journey <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link
            className={cn(
              "nav-link emergency-link",
              pathname === "/emergency" && "active",
            )}
            href="/emergency"
          >
            <ShieldCheck size={19} /> Emergency & safety
          </Link>
          {user?.role === "admin" && (
            <Link className="nav-link" href="/admin">
              <Settings2 size={19} /> Administration
            </Link>
          )}
          <Link href="/profile" className="profile-link">
            <span className="avatar">
              {user?.name.slice(0, 2).toUpperCase() || "ST"}
            </span>
            <span>
              {user?.name || "Student workspace"}
              <small>
                {user ? "Manage your account" : "Sign in to save your progress"}
              </small>
            </span>
            <ChevronDown size={15} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              ref={trigger}
              className="mobile-menu icon-button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-expanded={open}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>
                {nav.find((n) => n.href === pathname)?.label ||
                  {
                    "/emergency": "Emergency & safety",
                    "/profile": "My account",
                    "/admin": "Administration",
                    "/search": "Search",
                  }[pathname] ||
                  "Campus"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/search?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search campus"
                placeholder="Search anything…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <label className="campus-select">
              <Map size={15} />
              <select
                aria-label="Select campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value as Campus)}
              >
                <option value="all">Both campuses</option>
                <option value="new">New Campus</option>
                <option value="old">Old Campus</option>
              </select>
            </label>
            <Link
              href="/events"
              className="icon-button notification-button"
              aria-label="Campus updates"
            >
              <Bell size={19} />
              {notice && <i />}
            </Link>
          </div>
        </header>
        {notice && (
          <div className="update-notice" role="status">
            <Bell size={15} />
            {notice}
            <button onClick={dismissNotice} aria-label="Dismiss update">
              <X size={15} />
            </button>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="footer">
          <span>Built for your journey at BUK.</span>
          <span>
            <ShieldCheck size={13} /> Grounded in verified university
            information
          </span>
        </footer>
      </div>
    </div>
  );
}
