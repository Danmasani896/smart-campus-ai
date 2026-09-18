// Bulk import campus content from JSON or CSV. Usage:
//   npm run content:import -- path/to/places.csv
//   npm run content:import -- path/to/content.json
// Columns/keys: kind,title,body,campus,category,status,verified,sourceUrl,sourceLabel,
//   latitude,longitude,phone,startsAt,venue,id(optional). Rows with an existing id are updated.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { assertPublishable } from "../src/modules/content/content.service";
const db = new PrismaClient();
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim()));
  return body.map((r) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])),
  );
}
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass a .json or .csv file path.");
  const text = readFileSync(file, "utf8");
  const records: Record<string, string>[] = file.endsWith(".json")
    ? JSON.parse(text)
    : parseCsv(text);
  const institutionId = process.env.INSTITUTION_ID || "buk";
  let created = 0,
    updated = 0;
  for (const [index, raw] of records.entries()) {
    const num = (v?: string) =>
      v === undefined || v === "" ? null : Number(v);
    const data = {
      kind: raw.kind,
      title: raw.title,
      body: raw.body || "",
      campus: raw.campus || "all",
      category: raw.category || "General",
      status: raw.status || "draft",
      verified: /^(true|1|yes)$/i.test(String(raw.verified)),
      sourceUrl: raw.sourceUrl || null,
      sourceLabel: raw.sourceLabel || null,
      latitude: num(raw.latitude),
      longitude: num(raw.longitude),
      phone: raw.phone || null,
      venue: raw.venue || null,
      startsAt: raw.startsAt ? new Date(raw.startsAt) : null,
    };
    if (!data.kind || !data.title)
      throw new Error(`Row ${index + 1}: kind and title are required.`);
    if (data.startsAt && Number.isNaN(data.startsAt.getTime()))
      throw new Error(`Row ${index + 1}: invalid startsAt.`);
    assertPublishable({ ...data, verifiedAt: null } as never);
    const id =
      raw.id ||
      `import-${data.kind}-${data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60)}`;
    const existing = await db.content.findUnique({ where: { id } });
    await db.content.upsert({
      where: { id },
      create: {
        id,
        institutionId,
        ...data,
        verifiedAt: data.verified ? new Date() : null,
      },
      update: { ...data, verifiedAt: data.verified ? new Date() : null },
    });
    existing ? updated++ : created++;
  }
  console.log(
    `Imported ${records.length} rows: ${created} created, ${updated} updated.`,
  );
}
main()
  .catch((e) => {
    console.error(e.message || e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
