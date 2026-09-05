import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { asyncBufferFromUrl, parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = "v2026.08.1";
const columns = ["case_id", "title", "court", "year", "decision_date", "case_number", "judges", "bench", "bench_strength", "text_original", "source_url", "chunk_index", "total_chunks", "section_type", "citation", "petitioner", "respondent"];
const shards = [
  { courtType: "supreme_court", name: "Supreme Court of India", url: `https://oss-data-in.vaquill.ai/${snapshot}/in_supreme-court_judgments.parquet`, byteLength: 3761559020, rows: 900, limit: 18 },
  { courtType: "high_court", name: "High Court of Delhi", url: `https://oss-data-in.vaquill.ai/${snapshot}/in_delhi_judgments.parquet`, rows: 500, limit: 18 },
  { courtType: "high_court", name: "High Court of Bombay", url: `https://oss-data-in.vaquill.ai/${snapshot}/in_bombay_judgments.parquet`, rows: 500, limit: 18 },
  { courtType: "high_court", name: "High Court of Karnataka", url: `https://oss-data-in.vaquill.ai/${snapshot}/in_karnataka_judgments.parquet`, rows: 500, limit: 18 },
  { courtType: "high_court", name: "High Court of Sikkim", url: `https://oss-data-in.vaquill.ai/${snapshot}/in_sikkim_judgments.parquet`, byteLength: 22917212, rows: 500, limit: 18 },
];

function stringify(value) { return typeof value === "bigint" ? Number(value) : value; }
function mostlyLatin(text) { const letters = text.match(/\p{L}/gu) ?? []; return letters.length > 100 && letters.filter((letter) => /[A-Za-z]/.test(letter)).length / letters.length > 0.82; }

const judgments = [];
for (const shard of shards) {
  let importedFromShard = 0;
  const file = await asyncBufferFromUrl({ url: shard.url, byteLength: shard.byteLength });
  const rows = await parquetReadObjects({ file, compressors, rowStart: 0, rowEnd: shard.rows, columns });
  const grouped = new Map();
  for (const raw of rows) {
    const row = JSON.parse(JSON.stringify(raw, (_key, value) => stringify(value)));
    const group = grouped.get(row.case_id) ?? [];
    group.push(row); grouped.set(row.case_id, group);
  }
  for (const chunks of grouped.values()) {
    chunks.sort((a, b) => a.chunk_index - b.chunk_index);
    if (chunks.length !== chunks[0].total_chunks) continue;
    const text = chunks.map((chunk) => chunk.text_original).join("\n\n");
    if (!mostlyLatin(text)) continue;
    const first = chunks[0];
    judgments.push({
      id: first.case_id,
      title: first.title,
      court: first.court || shard.name,
      courtType: shard.courtType,
      year: first.year,
      decisionDate: first.decision_date,
      caseNumber: first.case_number,
      citation: first.citation,
      petitioner: first.petitioner,
      respondent: first.respondent,
      judges: first.judges ?? [],
      bench: first.bench || null,
      benchStrength: first.bench_strength || null,
      sourceUrl: first.source_url || null,
      datasetShard: shard.url,
      text,
      chunks: chunks.map((chunk) => ({ index: chunk.chunk_index, type: chunk.section_type })),
    });
    importedFromShard += 1;
    if (importedFromShard >= shard.limit) break;
  }
}

const output = {
  schemaVersion: 1,
  snapshot,
  importedAt: new Date().toISOString(),
  attribution: "Structured Indian primary-law data from the Open India Law corpus by Vaquill AI, used under CC BY 4.0.",
  repository: "https://github.com/Vaquill-AI/open-india-law",
  license: "https://creativecommons.org/licenses/by/4.0/",
  warning: "Point-in-time corpus data. Verify every judgment against its originating court source before relying on it.",
  judgments,
};
fs.mkdirSync(path.join(root, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(root, "src", "data", "judgments.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Imported ${judgments.length} complete sample judgments from ${snapshot}`);
