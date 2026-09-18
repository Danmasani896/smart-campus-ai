"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { useCampus } from "../providers";
import { Badge, Button, Card, ErrorNotice, PageHeading } from "../ui";
export function ProfileScreen() {
  const { user, login, logout } = useCampus(),
    [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password, register ? name : undefined);
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your campus workspace"
        description="Save your progress and keep your study documents private."
      />
      {user ? (
        <Card className="auth-card">
          <span className="avatar mb-4">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <Badge>{user.role}</Badge>
          <h2>{user.name}</h2>
          <p className="text-muted mb-5">{user.email}</p>
          <div className="stack">
            <Link className="btn btn-secondary" href="/documents">
              Open my documents
            </Link>
            <Link className="btn btn-secondary" href="/guide">
              Continue my checklist
            </Link>
            {user.role === "admin" && (
              <Link className="btn btn-primary" href="/admin">
                Open administration
              </Link>
            )}
            <Button variant="ghost" onClick={logout}>
              <LogOut size={15} /> Sign out
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="auth-card">
          <GraduationCap size={31} className="text-brand" />
          <h2>
            {register ? "Your journey starts here." : "Good to have you here."}
          </h2>
          <p className="muted-note mb-6">
            {register
              ? "Create a student account to save your first steps."
              : "Sign in to your personal campus workspace."}
          </p>
          {error && <ErrorNotice message={error} />}
          <form className="stack" onSubmit={submit}>
            {register && (
              <label className="field">
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              Password
              <span className="password-field">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="icon-button password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
              <small>At least 6 characters</small>
            </label>
            <Button disabled={busy} type="submit">
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            </Button>
          </form>
          <button
            className="btn btn-ghost w-full mt-3"
            onClick={() => {
              setRegister((r) => !r);
              setError("");
            }}
          >
            {register
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
          <p className="muted-note mt-4">
            <ShieldCheck size={12} className="inline mr-1" /> Your session stays
            in this tab’s memory. Reloading signs you out.
          </p>
        </Card>
      )}
    </div>
  );
}
