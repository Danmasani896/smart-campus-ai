# BUK Smart Campus — product and implementation plan

## Foundation and refined concept

Chapter One identifies fragmented information, missed events, unfamiliar buildings and weak access to emergency information. Smart Campus brings these tasks into one text-first companion for BUK Old and New Campuses. It never writes to university student or examination systems. Personal document intelligence is an extension requested in the product brief, not one of the four research core modules.

## Reference projects

`learn-smart`: feature modules, controllers/services, DTO validation, Prisma persistence, JWT authentication and API documentation. `learn-smart-web`: App Router, shared application shell, reusable controls, service layer and responsive student/admin workspaces. Smart Campus has its own midnight navy, electric blue and coral identity with self-hosted Sora headings and Plus Jakarta Sans body text. Reuse architectural patterns rather than copying unrelated learning, payment or examination features or any credentials.

## Features, navigation and screens

| Screen         | Purpose and layout                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Home           | Compact welcome, central question composer, task shortcuts, upcoming events, orientation progress and source policy    |
| Campus AI      | Full conversation workspace; campus filter, source cards, suggested questions, safe insufficient-evidence response     |
| Campus map     | Searchable list and interactive outdoor map; Old/New filters; only verified coordinates enable markers and directions  |
| Events         | Category filters, dated cards, live update indicator and detail expansion; administrators publish/archive records      |
| Fresher guide  | Ordered checklist; saved progress, expandable steps and links into chat                                                |
| Documents      | Private upload, extracted-text search, summary/key concepts/revision/questions/Q&A controls, expiry and deletion       |
| Emergency      | Persistent navigation shortcut; only verified telephone records become call actions; empty state never invents numbers |
| Search         | Categorized results across published content, locations, guides, contacts and events                                   |
| Profile        | Register/login/logout and account information                                                                          |
| Administration | Authenticated editor, content type/campus/status filters, source verification, CRUD and official document ingestion    |

## Journeys

Student: open Home → ask a question → retrieve approved campus content → read a sourced answer → open a location/event/guide → complete the task. Missing evidence is explicitly acknowledged. Campus context follows the selected filter.

Fresher: open guide → prepare admission documents → follow registration guidance → locate faculty → save checklist progress → consult campus AI for clarification → find verified emergency support. Checklist items are preparation prompts, not official registration instructions until reviewed.

Administrator: sign in with an administrator role → create draft content or upload an institutional document → add a source and review metadata → publish only after verification → edit/archive as information changes. Publications trigger event-stream notifications. Every content mutation is audited.

## Backend, data and API architecture

Next.js/Tailwind frontend → NestJS REST API → auth/content/documents/AI modules → Prisma database. Each application installs and deploys independently. SQLite is the runnable single-instance development database. A PostgreSQL deployment requires a provider change and new migrations; SQLite is not represented as a distributed database. Tenant identifier scopes all server queries; deploy separate instances per institution until tenant identity is derived from trusted authentication.

Core entities: User (role and password hash), Content (typed location/event/announcement/FAQ/guide/emergency/faculty/department/knowledge/campus record with campus, source, verification, coordinates and dates), Document (owner, private text, expiry), ChecklistProgress, AuditLog. Content's typed payload gives the MVP one publishing workflow; faculties and departments may be split into normalized relational tables when institutional hierarchy and editors grow.

Modules: Auth (`/auth/register`, `/auth/login`, `/auth/me`); Content (`/content`, `/content/:id`, `/content/stream`, `/admin/content`); AI (`/chat`); Documents (`/documents`, `/documents/:id/ask`, `/documents/:id`, `/admin/documents`); Checklist (`/checklist`). `/docs` exposes OpenAPI.

## AI/RAG architecture

The backend retrieves from published, verified institutional content scoped to the configured institution and selected campus. Lexical chunk ranking is the baseline retrieval implementation; citations are returned from actual retrieved records. If an LLM key is configured, retrieved excerpts are treated as untrusted data and supplied to a constrained generation prompt. Otherwise extractive responses work without a provider. No evidence means abstention, not generic model knowledge. Emergency queries use the verified directory deterministically. Personal document prompts never enter institutional retrieval. Conversational follow-ups can use recent user context without treating previous assistant text as evidence.

Future scale: evaluate hybrid BM25/vector retrieval, embedding jobs and pgvector, reranking and calibrated abstention on BUK questions before adopting them. No unused vector-service keys are required in the MVP. Publishing immediately changes eligible retrieval content; no stale vector index exists.

## Document workflow

Authenticated student → bounded multipart upload → extension/signature checks → PDF/DOC/DOCX/TXT extraction → bounded plain text → private database record with retention deadline → task-based grounded generation/retrieval → explicit delete or expiry purge. Legacy Word extraction supports OLE-based DOC files; encrypted documents and OCR are outside the initial implementation. Admin uploads instead create an unpublished institutional draft for review. Upload failures return actionable errors. No raw uploads are served publicly. Hosted LLM requests send only selected excerpts; the UI discloses this.

## Map architecture

Leaflet with OpenStreetMap tiles, attribution and campus selector. Building coordinates are admin-managed and verified before use. Routing links open an external walking-directions provider only for verified coordinates. No fabricated coordinates, indoor positioning, or internal turn-by-turn routing. Tile availability depends on connectivity; the location list remains accessible if tiles fail. Public tile policy must be reviewed for deployment scale; supply a hosted tile URL if required.

## Security and privacy

Scrypt password hashes, short-lived signed tokens held in browser session memory, role checks on every admin API, user ownership on document reads/deletes/queries, strict DTO validation, request throttling, Helmet headers, origin allowlist, limits on uploads and extraction, no client-side secrets, institution filters, content audits, deletion and retention. Browser checklist persistence is per authenticated account. Admin bootstrapping is explicit and refuses weak passwords. For production add HTTPS, backups, managed secret storage, malware scanning/OCR workers, email verification/reset, institutional SSO, distributed throttling and external security review. No claim of production certification.

## MVP versus future

MVP: all screens above, persistent CRUD and roles, grounded lexical RAG, optional provider generation, private document tools, actual map interface, SSE live publications, personal checklist and source-aware admin publishing. Future: SSO, web push/email subscriptions, vector/hybrid retrieval, OCR, reviewer/editor separation, normalized institutional hierarchy, multi-tenant administration and queued ingestion. Notifications are in-app while connected, not background push.

## Evaluation aligned with objective six

Automated tests cover evidence filtering, unknown-question abstention, upload isolation, publishing validation and unauthorized access. Manual usability study: freshers complete building lookup, registration guidance, event discovery and emergency lookup; record completion rate, time, errors and SUS score. Assemble reviewed BUK question/answer/source cases and measure retrieval recall, answer correctness, unsupported claims and abstention accuracy. Measure API p50/p95 latency separately for retrieval and hosted generation. Never invent research results; record measured outcomes after real participant testing.
