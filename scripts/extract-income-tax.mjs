import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceName = "Income_Tax_Act_2025_as_amended_by_FA_Act_2026.pdf";
const pdfPath = path.join(projectRoot, sourceName);
const outputPath = path.join(projectRoot, "src", "data", "income-tax-sections.json");
const parserVersion = "pdf-parse@2.4.5";
const sourceBytes = fs.readFileSync(pdfPath);
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
const parser = new PDFParse({ data: sourceBytes });
const result = await parser.getText();
await parser.destroy();

const candidates = [];
const documentLines = [];
for (const page of result.pages) {
  const lines = page.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pageStart = documentLines.length;
  for (const text of lines) documentLines.push({ text, page: page.num });
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(?:(\d)(\d{3})|(\d{1,3}))\.\s+(.+)$/);
    if (!match) continue;
    // Printed footnote markers can merge with a three-digit section number (for
    // example, footnote 5 followed by section 207 is extracted as "5207.").
    const number = Number(match[2] ?? match[3]);
    if (number < 1 || number > 600) continue;
    const titleLines = [lines[index - 2], lines[index - 1]].filter((candidate) => candidate && !/^(Code\.|--\s*\d+\s+of\s+\d+\s*--|\d+\.\s|\d{4}\.$)/i.test(candidate));
    const lastTitleLine = titleLines.at(-1);
    const title = lastTitleLine && (/^[a-z]/.test(lastTitleLine) || lastTitleLine.length < 30)
      ? titleLines.join(" ")
      : lastTitleLine ?? `Section ${number}`;
    candidates.push({
      number: String(number),
      title,
      headingLineCount: titleLines.length,
      startLine: pageStart + index,
      locator: { page: page.num, startPage: page.num, endPage: page.num },
      reviewStatus: "needs_review",
      publishable: false,
    });
  }
}

const sections = [];
for (const candidate of candidates) {
  if (!sections.some((section) => section.number === candidate.number)) sections.push(candidate);
}
for (let index = 0; index < sections.length; index += 1) {
  const section = sections[index];
  const nextSection = sections[index + 1];
  const nextStart = nextSection ? nextSection.startLine - nextSection.headingLineCount : documentLines.findIndex((line, lineIndex) => lineIndex > section.startLine && /^THE\s+(FIRST|SECOND)\s+SCHEDULE/i.test(line.text));
  const safeEnd = nextStart > section.startLine ? nextStart : documentLines.length;
  const selectedLines = documentLines.slice(section.startLine, safeEnd);
  section.body = selectedLines
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/.test(line.text))
    .map((line) => line.text)
    .join("\n");
  section.locator.endPage = selectedLines.at(-1)?.page ?? section.locator.startPage;
  delete section.startLine;
  delete section.headingLineCount;
}

const artifact = {
  schemaVersion: 3,
  artifactKind: "unreviewed_section_candidates",
  generatedAt: new Date().toISOString(),
  source: { name: sourceName, sha256: sourceSha256, pageCount: result.total },
  parser: { name: "pdf-parse", version: parserVersion },
  publication: {
    status: "withheld_pending_locator_review",
    warning: "Candidate text is internal review material and must not be exposed by public routes.",
  },
  sections,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`Extracted ${sections.length} unreviewed section candidates from ${result.total} pages`);
console.log(`Source SHA-256: ${sourceSha256}`);
