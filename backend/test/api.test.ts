import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/modules/auth/password";
import { docxFixture, pdfFixture } from "./fixtures";
test(
  "API enforces publishing, roles, private documents and grounded retrieval",
  { timeout: 120000 },
  async (t) => {
    const directory = mkdtempSync(path.join(tmpdir(), "campus-api-test-"));
    writeFileSync(path.join(directory, "test.db"), "");
    const databaseUrl = `file:${path.join(directory, "test.db").replace(/\\/g, "/")}`;
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      JWT_SECRET: randomBytes(40).toString("hex"),
      PORT: "4197",
      INSTITUTION_ID: "test",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
    };
    const migration = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { env, encoding: "utf8" },
    );
    assert.equal(migration.status, 0, migration.stderr || migration.stdout);
    const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    let server: ChildProcess | undefined;
    try {
      await db.user.create({
        data: {
          institutionId: "test",
          name: "Test admin",
          email: "admin@example.test",
          role: "admin",
          passwordHash: hashPassword("test-admin-password-long"),
        },
      });
      server = spawn(process.execPath, ["dist/main.js"], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let logs = "";
      server.stdout?.on("data", (d) => (logs += d));
      server.stderr?.on("data", (d) => (logs += d));
      const base = "http://127.0.0.1:4197/api";
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(`${base}/health`)).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(ready, logs);
      const request = async (
        url: string,
        method = "GET",
        body?: unknown,
        token?: string,
      ) => {
        const response = await fetch(base + url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, data: await response.json() };
      };
      const admin = (
        await request("/auth/login", "POST", {
          email: "admin@example.test",
          password: "test-admin-password-long",
        })
      ).data.token;
      assert.ok(admin);
      const a = (
        await request("/auth/register", "POST", {
          name: "Student A",
          email: "a@example.test",
          password: "test-student-password",
        })
      ).data.token;
      const b = (
        await request("/auth/register", "POST", {
          name: "Student B",
          email: "b@example.test",
          password: "test-student-password",
        })
      ).data.token;
      await t.test("student cannot assign their own role", async () => {
        assert.equal(
          (
            await request("/auth/register", "POST", {
              name: "Escalation",
              email: "escalate@example.test",
              password: "test-student-password",
              role: "admin",
            })
          ).status,
          400,
        );
      });
      await t.test(
        "administration rejects anonymous and student requests",
        async () => {
          assert.equal((await request("/admin/content")).status, 401);
          assert.equal(
            (await request("/admin/content", "GET", undefined, a)).status,
            403,
          );
        },
      );
      const draft = {
        kind: "knowledge",
        title: "Course registration",
        body: "For this test fixture, course registration begins at your faculty office.",
        campus: "new",
        category: "Academic",
        status: "draft",
        verified: false,
      };
      const created = await request("/admin/content", "POST", draft, admin);
      assert.equal(created.status, 201);
      const id = created.data.id;
      await t.test(
        "drafts do not leak into public content or chat",
        async () => {
          assert.deepEqual((await request("/content")).data, []);
          assert.equal(
            (
              await request("/chat", "POST", {
                message: "course registration",
                campus: "all",
              })
            ).data.mode,
            "insufficient-evidence",
          );
        },
      );
      await t.test("unverified publication is refused", async () => {
        assert.equal(
          (
            await request(
              `/admin/content/${id}`,
              "PUT",
              { ...draft, status: "published" },
              admin,
            )
          ).status,
          400,
        );
      });
      const published = {
        ...draft,
        status: "published",
        verified: true,
        sourceUrl: "https://example.org/reviewed",
        sourceLabel: "Automated test fixture",
      };
      assert.equal(
        (await request(`/admin/content/${id}`, "PUT", published, admin)).status,
        200,
      );
      await t.test(
        "answers cite only published records in the selected campus",
        async () => {
          const yes = await request("/chat", "POST", {
            message: "course registration",
            campus: "new",
          });
          assert.equal(yes.data.sources[0].id, id);
          assert.equal(yes.data.mode, "extractive");
          const no = await request("/chat", "POST", {
            message: "course registration",
            campus: "old",
          });
          assert.equal(no.data.mode, "insufficient-evidence");
        },
      );
      await t.test("emergency queries never invent contacts", async () => {
        const answer = await request("/chat", "POST", {
          message: "I need security",
          campus: "all",
        });
        assert.equal(answer.data.mode, "directory");
        assert.deepEqual(answer.data.sources, []);
        assert.match(answer.data.answer, /No verified emergency/);
      });
      await t.test(
        "long institutional documents retrieve the matching excerpt, not just the introduction",
        async () => {
          const long = await request(
            "/admin/content",
            "POST",
            {
              ...published,
              title: "Institutional handbook",
              body:
                "General introductory information. ".repeat(150) +
                "The chromatic badge identifies the test support desk.",
            },
            admin,
          );
          const answer = await request("/chat", "POST", {
            message: "chromatic badge",
            campus: "all",
          });
          assert.match(answer.data.answer, /chromatic badge/);
          assert.equal(answer.data.sources[0].id, long.data.id);
          await request(
            `/admin/content/${long.data.id}`,
            "DELETE",
            undefined,
            admin,
          );
        },
      );
      await t.test(
        "event intent finds future events without a title keyword match",
        async () => {
          const event = await request(
            "/admin/content",
            "POST",
            {
              ...published,
              kind: "event",
              title: "First steps workshop",
              body: "Join this automated fixture workshop.",
              startsAt: new Date(Date.now() + 86400000).toISOString(),
            },
            admin,
          );
          const answer = await request("/chat", "POST", {
            message: "What events are happening this week?",
            campus: "all",
          });
          assert.equal(answer.data.sources[0].id, event.data.id);
          assert.match(answer.data.answer, /Date:/);
          await request(
            `/admin/content/${event.data.id}`,
            "DELETE",
            undefined,
            admin,
          );
        },
      );
      await t.test(
        "live content updates arrive through the event stream",
        async () => {
          const abort = new AbortController();
          const timer = setTimeout(() => abort.abort(), 5000);
          try {
            const stream = await fetch(`${base}/content/stream`, {
              signal: abort.signal,
            });
            const reader = stream.body!.getReader();
            await request(`/admin/content/${id}`, "PUT", published, admin);
            let text = "";
            while (!text.includes("event: content")) {
              const next = await reader.read();
              if (next.done) break;
              text += new TextDecoder().decode(next.value);
            }
            assert.match(text, /event: content/);
            assert.ok(text.includes(id));
            await reader.cancel();
          } finally {
            clearTimeout(timer);
            abort.abort();
          }
        },
      );
      await t.test(
        "only administrators can change another user role",
        async () => {
          const users = (await request("/admin/users", "GET", undefined, admin))
            .data;
          const own = users.find(
            (u: { email: string }) => u.email === "admin@example.test",
          );
          assert.equal(
            (
              await request(
                `/admin/users/${own.id}/role`,
                "PUT",
                { role: "student" },
                admin,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await request(
                `/admin/users/${own.id}/role`,
                "PUT",
                { role: "student" },
                a,
              )
            ).status,
            403,
          );
        },
      );
      let docId = "";
      await t.test(
        "private document extraction works and ownership is enforced",
        async () => {
          const form = new FormData();
          form.append(
            "file",
            new Blob(
              [
                "Photosynthesis converts sunlight into chemical energy. Chlorophyll absorbs light in plants.",
              ],
              { type: "text/plain" },
            ),
            "biology.txt",
          );
          const uploaded = await fetch(`${base}/documents`, {
            method: "POST",
            headers: { Authorization: `Bearer ${a}` },
            body: form,
          });
          assert.equal(uploaded.status, 201);
          docId = ((await uploaded.json()) as { id: string }).id;
          assert.equal(
            (await request(`/documents/${docId}`, "GET", undefined, b)).status,
            404,
          );
          assert.equal(
            (
              await request(
                `/documents/${docId}/ask`,
                "POST",
                { task: "summary" },
                b,
              )
            ).status,
            404,
          );
          assert.equal(
            (await request(`/documents/${docId}`, "DELETE", undefined, b))
              .status,
            404,
          );
          const answer = await request(
            `/documents/${docId}/ask`,
            "POST",
            { task: "ask", question: "What does chlorophyll absorb?" },
            a,
          );
          assert.equal(answer.status, 201);
          assert.match(answer.data.answer, /Chlorophyll/);
          assert.equal(
            (
              await request("/chat", "POST", {
                message: "photosynthesis chlorophyll",
                campus: "all",
              })
            ).data.mode,
            "insufficient-evidence",
          );
        },
      );
      await t.test(
        "PDF extraction reads text and files with invalid signatures are rejected",
        async () => {
          const form = new FormData();
          form.append(
            "file",
            new Blob([new Uint8Array(pdfFixture())], {
              type: "application/pdf",
            }),
            "biology.pdf",
          );
          const response = await fetch(`${base}/documents`, {
            method: "POST",
            headers: { Authorization: `Bearer ${a}` },
            body: form,
          });
          const data = await response.json();
          assert.equal(response.status, 201, JSON.stringify(data));
          const doc = await request(
            `/documents/${data.id}`,
            "GET",
            undefined,
            a,
          );
          assert.match(doc.data.text, /Photosynthesis/);
          const legacy = new FormData();
          legacy.append(
            "file",
            new Blob(["old binary document"]),
            "legacy.doc",
          );
          const refused = await fetch(`${base}/documents`, {
            method: "POST",
            headers: { Authorization: `Bearer ${a}` },
            body: legacy,
          });
          assert.equal(refused.status, 400);
          assert.match(
            (await refused.json()).message,
            /Unsupported file or signature/,
          );
        },
      );
      await t.test(
        "DOCX extraction reads the academic document body",
        async () => {
          const form = new FormData();
          form.append(
            "file",
            new Blob([new Uint8Array(await docxFixture())]),
            "biology.docx",
          );
          const response = await fetch(`${base}/documents`, {
            method: "POST",
            headers: { Authorization: `Bearer ${a}` },
            body: form,
          });
          const data = await response.json();
          assert.equal(response.status, 201, JSON.stringify(data));
          const doc = await request(
            `/documents/${data.id}`,
            "GET",
            undefined,
            a,
          );
          assert.match(doc.data.text, /Photosynthesis/);
        },
      );
      await t.test("expired documents cannot be read", async () => {
        await db.document.update({
          where: { id: docId },
          data: { expiresAt: new Date(0) },
        });
        assert.equal(
          (await request(`/documents/${docId}`, "GET", undefined, a)).status,
          404,
        );
      });
      await t.test("checklist progress belongs to its user", async () => {
        assert.equal(
          (await request("/checklist/prepare", "PUT", undefined, a)).status,
          200,
        );
        assert.equal(
          (await request("/checklist", "GET", undefined, a)).data.length,
          1,
        );
        assert.equal(
          (await request("/checklist", "GET", undefined, b)).data.length,
          0,
        );
      });
      await t.test(
        "archiving removes evidence and changes are audited",
        async () => {
          assert.equal(
            (
              await request(
                `/admin/content/${id}`,
                "PUT",
                { ...published, status: "archived" },
                admin,
              )
            ).status,
            200,
          );
          assert.deepEqual((await request("/content")).data, []);
          assert.ok((await db.auditLog.count()) >= 3);
        },
      );
    } finally {
      if (server && server.exitCode === null && server.signalCode === null) {
        const exited = new Promise<void>((resolve) =>
          server!.once("exit", () => resolve()),
        );
        server.kill();
        await exited;
      }
      await db.$disconnect();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
