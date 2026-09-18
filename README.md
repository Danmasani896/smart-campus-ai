# BUK Smart Campus

A text-first campus companion for Bayero University, Kano, aligned with the supplied Chapter One. Next.js + Tailwind frontend and NestJS + Prisma backend live in separate folders. Design and module patterns reference `learn-smart-web` and `learn-smart`.

## Local setup

Requires Node.js 20.19+ (or Node 22 LTS) and npm. Run from this folder:

```powershell
npm run install:all
node scripts/setup.cjs
npm run db:generate --prefix backend
npm run db:deploy --prefix backend
npm run db:seed --prefix backend
```

Start in two terminals:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Open [student app](http://localhost:3000), [API health](http://localhost:4000/api/health), or [OpenAPI documentation](http://localhost:4000/docs). `127.0.0.1` works too.

## Administrator and content

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (16+ characters) and optionally `ADMIN_NAME` in `backend/.env`, then run:

```powershell
npm run admin:create --prefix backend
```

Remove `ADMIN_PASSWORD` after bootstrapping. Sign in at `/profile` and open `/admin`. Create or import content, add an official HTTPS source, verify it, then publish. You can edit, archive or delete each content type. Only administrators can publish, and every mutation is audited. Roles are assigned through trusted bootstrap, not public registration.

The seed includes **34 published, source-linked BUK FAQs**, paraphrased from the official university pages, plus operational **drafts** for review. FAQs appear in `/faq`, search and Campus AI. Re-running `npm run db:seed` in `backend` adds missing records without overwriting editorial changes. Chapter One establishes scope rather than operational facts; map locations, events and other directory records still need university review. See [FAQ provenance and branding](docs/BRAND-AND-FAQ.md).

## Included workflows

- Student overview and central campus chat with source citations, campus filtering and abstention.
- Interactive Leaflet map, verified building markers and external walking-direction links.
- Events and announcements with live Server-Sent Events invalidation while connected.
- Fresher checklist with per-account saved progress.
- Private PDF/DOC/DOCX/TXT extraction, document text search and eight study tasks. Scanned PDFs need OCR first; encrypted files are not supported.
- Verified emergency directory and universal categorized search.
- Registration, sign-in, session-memory tokens and student/admin authorization.
- Administrative CRUD for knowledge, FAQ, location, event, announcement, emergency, guide, faculty, department and campus content. Institutional uploads become review drafts.
- SQLite persistence, Prisma migration, OpenAPI, request validation/throttling and audited content changes.

Optional OpenAI generation requires **`OPENAI_API_KEY` + `OPENAI_MODEL`**. Otherwise grounded excerpts work without cloud credentials. See the [complete environment/key guide](docs/ENVIRONMENT.md).

## Structure

```text
frontend/src/app/                  App Router routes, theme and error boundaries
frontend/src/components/layout/   Shared responsive application shell
frontend/src/components/features/ Student and administrative screens
frontend/src/components/ui.tsx    Reusable UI primitives
frontend/src/lib/                 API client and shared frontend types
backend/src/modules/              Auth, content, AI, documents, checklist
backend/src/common/               Database and configuration
backend/prisma/                   Schema, migrations, sourced FAQs and draft seed
backend/test/                     Retrieval and API integration checks
docs/                            Product, architecture, environment and evaluation
```

## Validation

```powershell
npm run build
npm run typecheck
npm test
```

The integration tests create an isolated temporary SQLite database and start an API on a test port; they do not use your accounts or alter your local campus database. Browser checks live in `frontend/tests`; start both apps, then run `npm run test:browser` from the project root. They use locally installed Microsoft Edge; change `channel` in the Playwright configuration to use another installed Chromium browser.

After changing the Prisma schema, stop the API before running `npm run db:generate --prefix backend` on Windows (the running server holds the native client DLL open). Ordinary builds only compile TypeScript.

See [product and architecture](docs/PRODUCT-AND-ARCHITECTURE.md) for journeys, screen layouts, entity/module mapping, security, research evaluation and MVP/future boundaries. This is a runnable MVP, not an assertion of institutional approval or production readiness. Hosted generation, university data accuracy, research usability results and production load require their own validation.

See [local validation results](docs/VALIDATION.md) for the checks performed and their limits.
