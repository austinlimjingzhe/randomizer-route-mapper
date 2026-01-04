// scraper/run.ts
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { fileURLToPath } from "url";

type Row = { identifier: string; region_id: string };

const REGION_ID_TO_GEN: Record<number, number> = {
  1: 1, // Kanto
  2: 2, // Johto
  3: 3, // Hoenn
  4: 4, // Sinnoh
  5: 5, // Unova
  6: 6, // Kalos
  7: 7, // Alola
  8: 8, // Galar
  9: 9, // Paldea
};

function canonicalize(input: string) {
  return input
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/’/g, "'")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

function makeId(gen: number, regionId: number, identifier: string) {
  return `gen${gen}:r${regionId}:${canonicalize(identifier)}`;
}

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always write to <project-root>/data (project-root is one level above /scraper)
const OUT_DIR = path.resolve(__dirname, "../public/data");

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npx tsx scraper/run.ts "C:\\path\\to\\locations.csv"');
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[];

  const byGen = new Map<number, Array<{ id: string; identifier: string; generation: number; regionId: number }>>();

  for (const r of rows) {
    const identifier = String((r as any).identifier ?? "").trim();
    const regionRaw = String((r as any).region_id ?? "").trim();
    const regionId = Number(regionRaw);

    if (!identifier || !Number.isFinite(regionId)) continue;

    const gen = REGION_ID_TO_GEN[regionId];
    if (!gen) continue;

    const item = {
      id: makeId(gen, regionId, identifier),
      identifier: identifier,
      generation: gen,
      regionId,
    };

    if (!byGen.has(gen)) byGen.set(gen, []);
    byGen.get(gen)!.push(item);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (byGen.size === 0) {
    console.warn(
      "No rows were written. Check your CSV headers (expected: name, region) and region IDs mapping."
    );
  }

  for (const [gen, list] of byGen.entries()) {
    // dedupe by id
    const seen = new Set<string>();
    const deduped = list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
    deduped.sort((a, b) => a.identifier.localeCompare(b.identifier));

    const outPath = path.join(OUT_DIR, `gen${gen}.json`);

    fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2), "utf8");
    console.log(`Wrote ${outPath} (${deduped.length})`);
  }

  console.log(`Done. Output folder: ${OUT_DIR}`);
}

main();
