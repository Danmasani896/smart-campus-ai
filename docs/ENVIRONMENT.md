# Environment variables and keys

Run `node scripts/setup.cjs` from the project root. It creates `backend/.env` and `frontend/.env.local`, generates a strong JWT signing secret, and never overwrites existing files. Both local files are ignored by Git. The committed `.env.example` files are safe templates.

## Backend: backend/.env

| Variable                   | Required?              | What to provide                                                                                                                                                    |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`             | Yes                    | Default `file:./campus.db` creates a local SQLite database beside the Prisma schema. No database service/key is needed for local use.                              |
| `JWT_SECRET`               | Yes                    | Random secret, at least 32 characters. Setup generates 48 random bytes encoded as hex. Changing it invalidates signed-in sessions. Never expose to frontend.       |
| `PORT`                     | Default 4000           | Backend HTTP port. Match the frontend `API_PROXY_TARGET`.                                                                                                          |
| `HOST`                     | Default all interfaces | Leave empty so `localhost`, `127.0.0.1` and `::1` all reach the API. Set `127.0.0.1` to pin one interface.                                                         |
| `FRONTEND_ORIGIN`          | Default both dev hosts | Comma-separated browser origins allowed to call the API directly (default `http://localhost:3000,http://127.0.0.1:3000`). Not needed for the Next.js `/api` proxy. |
| `INSTITUTION_ID`           | Default `buk`          | Server-side data namespace. Changing it selects a separate dataset. It is not a client-controlled tenant selector.                                                 |
| `NODE_ENV`                 | Default development    | Set `production` on deployment.                                                                                                                                    |
| `OPENAI_API_KEY`           | Optional               | A server-side API key from your own OpenAI project. Leave empty for extractive retrieval with no AI billing. Never use `NEXT_PUBLIC_` for this key.                |
| `OPENAI_MODEL`             | Required with API key  | Set the exact Responses-compatible model identifier available to your project. No model is silently selected.                                                      |
| `DOCUMENT_RETENTION_HOURS` | Default 24             | 1–168 hours. Expired personal extracted text becomes inaccessible immediately and is deleted at startup or by a one-minute cleanup task.                           |
| `ADMIN_EMAIL`              | Only for bootstrap     | Your chosen administrator email. No default administrator account exists.                                                                                          |
| `ADMIN_PASSWORD`           | Only for bootstrap     | At least 6 characters.  Run `npm run admin:create --prefix backend`, then remove this value. Bootstrap can also deliberately reset that admin’s password.          |
| `ADMIN_NAME`               | Optional bootstrap     | Display name; defaults to Campus Administrator.                                                                                                                    |

### AI behavior

Without the two AI variables, campus chat returns retrieved official excerpts and documents return clearly labeled source excerpts. Generated summaries, explanations and practice questions require the provider configuration. Provider failure falls back to excerpts instead of fabricating output. The Responses request uses `store: false`; this does not promise zero provider-side retention under every account policy. Review your institution’s data policy before sending personal notes.

Implementation reference: [OpenAI Responses API](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create). No AI key was supplied, so live paid generation is not verified by the local automated tests.

## Frontend: frontend/.env.local

| Variable                      | Required?                       | What to provide                                                                                                                                                                               |
| ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | Default `/api`                  | Relative `/api` is proxied by Next.js to the backend on the same origin (no CORS, works on any hostname). Use an absolute HTTPS URL only when the API is on a separate host.                  |
| `API_PROXY_TARGET`            | Default `http://127.0.0.1:4000` | Server-side only. Where Next.js forwards `/api/*` requests.                                                                                                                                   |
| `NEXT_PUBLIC_MAP_TILE_URL`    | Optional                        | Defaults to OpenStreetMap tiles. For Mapbox use `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=pk...` with a public token restricted to your domain. |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | Required for chosen provider    | Default `© OpenStreetMap contributors`. Preserve attribution required by your tile provider.                                                                                                  |

Next.js embeds `NEXT_PUBLIC_*` values into the client build: rebuild after changing them. There are no Google Maps, vector database, SMTP, S3 or Redis keys required by this implementation. External walking directions are ordinary links. Do not add unused service credentials.

## Deployment notes

Run backend behind an HTTPS reverse proxy to its loopback listener. The current SQLite file must live on persistent storage on one backend instance. Back up that file securely, including user data and audit records. Before using multiple replicas, migrate the Prisma provider/schema to PostgreSQL, add distributed event fanout and rate-limit storage, and execute migration/restore tests. Database provider migrations are not interchangeable.

No secrets were copied from the reference projects. Do not commit local `.env` files, the database, uploads, or passwords.
