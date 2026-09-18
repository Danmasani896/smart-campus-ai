# Smart Campus identity and FAQ sources

The September 2026 refresh separates Smart Campus visually from the LearnSmart reference: midnight navy (`#101931`), electric blue (`#315efb`), coral (`#ff9a80`) and cool off-white. Sora Variable supplies headings; Plus Jakarta Sans Variable supplies body text. Both fonts are bundled locally through Fontsource, with no external font request or additional API key.

The FAQ screen supports text search, five categories, keyboard-accessible expandable answers, source links and Campus AI handoff. Home and navigation link to it; global search resolves FAQ results to `/faq?id=...`. Exact FAQ questions return their stored answer and citation without needing an AI provider. Safety answers also appear in the emergency screen.

## Provenance

All 34 supplied questions have concise paraphrased answers in `backend/prisma/buk-faqs.ts`. Sources were checked on 18 September 2026 using BUK's [official collection](https://buk.edu.ng/faqs-by-category), [admissions FAQs](https://buk.edu.ng/faq_a%26e), [academic FAQs](https://www.buk.edu.ng/faq_a%26p), [student-life FAQs](https://buk.edu.ng/faq_s%26c) and individual source pages linked on every record. The original pages were published in 2025. The review date records a source check, not an independent confirmation by the university or a test call to telephone numbers.

The Post-UTME answer explicitly identifies the source's 2025 portal reference and directs students to current announcements. No current deadline, fee, or admissions cutoff is inferred. Security and clinic numbers are attributed to BUK's FAQs; the general university line is not labeled as an emergency hotline.

Run `npm run db:seed` from `backend` after migrations. Stable IDs prevent duplicates; existing records, including edits and archived entries, are preserved. Editors can update source and review metadata in the admin interface. No extra environment variable is needed.
