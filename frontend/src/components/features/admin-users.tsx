"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useCampus } from "../providers";
import { Card, ErrorNotice } from "../ui";
export function AdminUsers() {
  const { user } = useCampus(),
    [users, setUsers] = useState<User[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<User[]>("/admin/users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);
  async function change(target: User, role: string) {
    if (
      !window.confirm(
        `Change ${target.name}'s role to ${role}? Administrators can publish content and manage users.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const updated = await api<User>(`/admin/users/${target.id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="mt-6">
      <h2>User roles</h2>
      <p className="muted-note mt-2 mb-4">
        The 200 most recent accounts. Role changes apply to the next API request
        and are audited. You cannot change your own role.
      </p>
      {error && <ErrorNotice message={error} />}
      <div className="stack">
        {users.map((person) => (
          <div className="flex gap-4 items-center flex-wrap" key={person.id}>
            <div className="flex-1 min-w-0">
              <h3>{person.name}</h3>
              <p className="muted-note break-all">{person.email}</p>
            </div>
            <select
              className="input max-w-32"
              aria-label={`Role for ${person.name}`}
              value={person.role}
              disabled={busy || person.id === user?.id}
              onChange={(e) => void change(person, e.target.value)}
            >
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        ))}
      </div>
    </Card>
  );
}
