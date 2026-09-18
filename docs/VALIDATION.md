# Local validation — 18 September 2026

| Check                                         | Result                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| NestJS TypeScript build                       | Passed                                                                                                                               |
| Next.js production build and route generation | Passed                                                                                                                               |
| Backend test suite                            | 25 checks passed                                                                                                                     |
| Student browser workflow in headless Edge     | Passed: overview → chat, private-document sign-in gate, checklist sign-in gate, events, emergency, Leaflet map and mobile navigation |
| Admin browser workflow in headless Edge       | Passed: login → draft review → verified publication payload; uses mocked admin responses and does not create a real admin account    |
| API role enforcement                          | Tested independently against a real isolated SQLite database                                                                         |
| Production dependency audits                  | Zero known vulnerabilities reported for both applications at validation time                                                         |
| Desktop and mobile visual inspection          | Reviewed at 1440×1000 and 390×844                                                                                                    |
| Environment/database exclusion from Git       | Confirmed                                                                                                                            |

Backend checks include denied privilege escalation, anonymous/student admin rejection, draft exclusion, publication validation, campus-scoped citations, unknown-question abstention, deterministic emergency behavior, long-document chunk retrieval, upcoming event intent, live SSE delivery, role restrictions, document ownership, TXT/PDF/DOCX extraction, invalid signature rejection, expiry, checklist ownership and archival/auditing.

API integration tests use temporary synthetic university records, never student records. FAQ retrieval checks additionally use the 34 publicly sourced BUK FAQ records. The PDF and DOCX fixtures are generated in memory. Legacy OLE DOC support is implemented through `word-extractor`; a representative real legacy DOC corpus has not been tested here. Encrypted documents and scanned PDFs are outside this parser workflow.

Live paid AI generation was not called because no provider credentials were supplied. Retrieval and no-provider extractive fallback were tested. Vector search, background push delivery, production load, actual BUK source correctness, institutional approval and participant usability outcomes are not established by these checks. Lexical retrieval quality needs evaluation on a curated BUK question set before academic accuracy results can be reported.

## Reproduce

Run the setup instructions in the root README, then `npm test`, `npm run build`, and `npm run typecheck`. With both applications running, run `npm run test:browser`. Audits can be repeated with `npm audit --prefix backend --omit=dev` and `npm audit --prefix frontend --omit=dev`.

## Research evaluation worksheet

For each reviewed question, record: question ID, campus, expected source, expected answer, retrieved sources, response, correctness (reviewer), unsupported statements, abstention appropriateness and latency. Compute retrieval recall and grounded-answer accuracy separately from abstention accuracy.

For a usability session, record participant consent, task completion, time on task, errors and SUS responses. Include tasks for registration guidance, building lookup, finding an event, locating emergency support and completing a fresher checklist step. Do not substitute automated browser passes for human usability evidence.


## Rebrand and FAQ verification

Production builds passed after the navy/blue/coral refresh. All three Edge browser workflows passed, including FAQ search, filtering, source links, chat handoff and mobile overflow checks. All 34 exact questions return their own sourced answer; unknown queries still abstain. Re-running the FAQ seed retained exactly 34 entries. Desktop and mobile screenshots are in docs/screenshots. No new environment variables or external font service are needed.
