import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunks, rank } from "../src/modules/ai/retrieval";
import { normalizeExtractedText } from "../src/modules/documents/extract";
import { assertPublishable } from "../src/modules/content/content.service";
import { hashPassword, checkPassword } from "../src/modules/auth/password";
import { bukFaqs } from "../prisma/buk-faqs";
import { AiService } from "../src/modules/ai/ai.service";
import type { ContentService } from "../src/modules/content/content.service";

test("all supplied FAQ questions return their own sourced answers", async () => {
  assert.equal(bukFaqs.length, 34);
  assert.equal(new Set(bukFaqs.map((row) => row.id)).size, 34);
  const service = new AiService({
    list: async () => bukFaqs,
  } as unknown as ContentService);
  for (const faq of bukFaqs) {
    const result = await service.chat(faq.title, "all");
    assert.equal(result.answer, faq.body);
    assert.equal(result.sources[0].url, faq.sourceUrl);
  }
  const unknown = await service.chat(
    "Where can I find a teleportation station?",
    "all",
  );
  assert.equal(unknown.mode, "insufficient-evidence");
  const security = await service.chat("security help", "new");
  assert.match(security.answer, /08094086981/);
});
test("retrieval abstains when no source matches", () => {
  assert.deepEqual(
    rank("quantum entanglement", [
      {
        title: "Course registration",
        body: "Registration guidance is provided by student affairs.",
      },
    ]),
    [],
  );
});
test("retrieval requires meaningful query coverage", () => {
  assert.deepEqual(
    rank("scholarship application deadline", [
      { title: "Hostel application", body: "Ask the accommodation office." },
    ]),
    [],
  );
});
test("retrieval ranks title matches and finds relevant evidence", () => {
  assert.equal(
    rank("course registration", [
      {
        title: "Course registration",
        body: "Follow the approved course registration steps.",
      },
      { title: "Library", body: "Borrowing books." },
    ])[0]?.title,
    "Course registration",
  );
});
test("chunk overlap preserves boundary context", () => {
  const input = "a".repeat(4000);
  const result = chunks(input);
  assert.equal(result.length, 4);
  assert.equal(result[0].length, 1400);
  assert.equal(result.at(-1)?.length, 340);
});
test("publishing requires verification and source metadata", () => {
  assert.throws(() =>
    assertPublishable({
      kind: "knowledge",
      title: "Registration",
      body: "Source content.",
      campus: "all",
      category: "General",
      status: "published",
      verified: false,
    }),
  );
});
test("emergency publishing requires a telephone", () => {
  assert.throws(() =>
    assertPublishable({
      kind: "emergency",
      title: "Security",
      body: "Contact campus security.",
      campus: "all",
      category: "Safety",
      status: "published",
      verified: true,
      sourceUrl: "https://example.org",
      sourceLabel: "Test source",
    }),
  );
});
test("password hashes are salted and verified", () => {
  const hash = hashPassword("test-password-long");
  assert.notEqual(hash, hashPassword("test-password-long"));
  assert.ok(checkPassword("test-password-long", hash));
  assert.equal(checkPassword("incorrect", hash), false);
});
test("extracted text re-joins one-glyph-per-line runs and tidies whitespace", () => {
  const shattered =
    "Course Outline\r\n\r\n\r\n\r\n" +
    "C\ne\nr\nt\ni\nf\ni\ne\nd\n \nb\ny\n \nB\nU\nK\n\n" +
    "Week 1:   Intro  to  systems\t\nA.\nB.\nC.\n";
  assert.equal(
    normalizeExtractedText(shattered),
    "Course Outline\n\nCertified by BUK\n\nWeek 1: Intro to systems\nA.\nB.\nC.",
  );
});
