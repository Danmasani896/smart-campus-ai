import { BadRequestException } from "@nestjs/common";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import WordExtractor from "word-extractor";
// PDF text layers often place each glyph of letter-spaced or curved headings
// (certificates, posters) as its own positioned item, which pdf-parse emits as
// one character per line. Re-join those runs and tidy whitespace so the text
// reads as prose, chunks well for retrieval, and renders cleanly with pre-wrap.
export function normalizeExtractedText(raw: string) {
  const lines = raw
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\s ]+/g, " ").trim());
  const out: string[] = [];
  for (let i = 0; i < lines.length;) {
    if (lines[i] === "") {
      out.push(lines[i++]);
      continue;
    }
    // A run of very short lines (glyphs, with blank lines as word gaps).
    let j = i;
    while (j < lines.length && lines[j].length <= 2) j++;
    while (j > i && lines[j - 1] === "") j--;
    const run = lines.slice(i, j);
    if (run.filter(Boolean).length >= 4) {
      out.push(
        run
          .map((l) => l || " ")
          .join("")
          .replace(/ {2,}/g, " ")
          .trim(),
      );
      i = j;
    } else out.push(lines[i++]);
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export async function extract(file?: Express.Multer.File) {
  if (!file)
    throw new BadRequestException(
      "Choose a PDF, DOC, DOCX or UTF-8 TXT document.",
    );
  const ext = file.originalname.split(".").pop()?.toLowerCase();
  let text = "";
  try {
    if (ext === "txt") {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
      if (text.includes("\0")) throw new Error();
    } else if (
      ext === "doc" &&
      file.buffer.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"))
    ) {
      text = (await new WordExtractor().extract(file.buffer)).getBody();
    } else if (
      ext === "pdf" &&
      file.buffer.subarray(0, 5).toString() === "%PDF-"
    ) {
      const parser = new PDFParse({
        data: new Uint8Array(file.buffer),
        isEvalSupported: false,
      });
      try {
        const info = await parser.getInfo();
        if (info.total > 200)
          throw new BadRequestException(
            "PDFs are limited to 200 pages. Split this document before uploading.",
          );
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (
      ext === "docx" &&
      file.buffer.subarray(0, 2).toString() === "PK"
    ) {
      // Refuse compressed ZIP expansion above 20 MB before handing it to the parser.
      let expanded = 0;
      for (let i = 0; i + 46 < file.buffer.length; i++)
        if (file.buffer.readUInt32LE(i) === 0x02014b50)
          expanded += file.buffer.readUInt32LE(i + 24);
      if (expanded > 20 * 1024 * 1024)
        throw new BadRequestException("DOCX decompressed size exceeds 20 MB.");
      text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    } else
      throw new BadRequestException(
        "Unsupported file or signature. Choose a valid PDF, DOC, DOCX or UTF-8 TXT document.",
      );
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(
      "Could not read this document. Use an unencrypted text-based PDF, DOC, DOCX or UTF-8 TXT file.",
    );
  }
  text = normalizeExtractedText(text);
  if (text.length < 30)
    throw new BadRequestException(
      "Not enough readable text. Scanned PDFs need OCR before uploading.",
    );
  if (text.length > 200000)
    throw new BadRequestException(
      "Document exceeds 200,000 extracted characters. Split it into smaller files.",
    );
  return {
    name: file.originalname.replace(/[\\/<>]/g, "_").slice(0, 160),
    text,
  };
}
