// ──────────────────────────────────────────────────────────
// 🎨 Scrape Similar Paints — RedGrimm Paint Conversion
// ──────────────────────────────────────────────────────────
// Scrapes paint equivalences from RedGrimm's paint conversion tool
// and outputs a JSON file for seeding the similar_paints table.
//
// Source: https://redgrimm.github.io/paint-conversion/
// Delta score: mathematical color distance — < 3 = near-identical, < 7 = safe substitute
//
// USAGE: tsx scripts/scrape-similar-paints.ts
// OUTPUT: server/data/similar-paints.json
// ──────────────────────────────────────────────────────────

import https from 'https';
import fs from 'fs';
import path from 'path';

// ── Config ────────────────────────────────────────────────

const BASE_URL = 'https://redgrimm.github.io/paint-conversion/';
const MAX_DELTA = 7; // only include good + decent matches
const OUTPUT_FILE = path.join(__dirname, '../data/similar-paints.json');

// RedGrimm pages to scrape: source brand + page URL
// P3 is intentionally excluded — not in our paints DB
const PAGES = [
  { url: `${BASE_URL}index.html`, brandSlug: 'citadel', rangePrefix: '' },
  { url: `${BASE_URL}vallejo-model.html`, brandSlug: 'vallejo', rangePrefix: 'Model Color' },
  { url: `${BASE_URL}vallejo-game.html`, brandSlug: 'vallejo', rangePrefix: 'Game Color' },
  { url: `${BASE_URL}army-painter.html`, brandSlug: 'army-painter', rangePrefix: '' },
];

// ── Paint DB ──────────────────────────────────────────────

type Paint = { name: string; brandSlug: string; range: string; code?: string };

const paintsDb: Paint[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/paints-full.json'), 'utf8'),
);

// Map: "brandSlug:name_lowercase" → Paint
const lookup = new Map<string, Paint>();
for (const paint of paintsDb) {
  lookup.set(`${paint.brandSlug}:${paint.name.toLowerCase()}`, paint);
}

// RedGrimm uses short paint names; our DB prefixes with the range name for Vallejo
// e.g. RedGrimm "Dead White" (Vallejo Game) → our DB "Game Color Dead White"
function findPaint(brandSlug: string, rangePrefix: string, redgrimmName: string): Paint | undefined {
  const fullName = rangePrefix ? `${rangePrefix} ${redgrimmName}` : redgrimmName;
  return lookup.get(`${brandSlug}:${fullName.toLowerCase()}`);
}

// ── HTTP ──────────────────────────────────────────────────

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk.toString()));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

// ── HTML Parsing ──────────────────────────────────────────

type ColumnTarget = { colIndex: number; brandSlug: string; rangePrefix: string };

// Parses the header <tr> to find which column index corresponds to which brand.
// RedGrimm structure: [Name col] [Color swatch col] [Match name col] [Color swatch col] [Match name col] ...
// The brand label is in the color swatch th, and the match data is in the NEXT column (colIndex + 1).
function parseHeaderTargets(headerRow: string): ColumnTarget[] {
  const targets: ColumnTarget[] = [];
  const thMatches = [...headerRow.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)];

  thMatches.forEach((th, idx) => {
    // Normalize: strip tags iteratively (prevents incomplete multi-char sanitization),
    // collapse whitespace, lowercase
    let raw = th[1].replace(/<br\s*\/?>/gi, ' ');
    let prev: string;
    do { prev = raw; raw = raw.replace(/<[^>]+>/g, ''); } while (raw !== prev);
    const text = raw.trim().toLowerCase().replace(/\s+/g, ' ');

    let brandSlug: string | undefined;
    let rangePrefix = '';

    if (text.includes('vallejo') && text.includes('game')) {
      brandSlug = 'vallejo';
      rangePrefix = 'Game Color';
    } else if (text.includes('vallejo') && text.includes('model')) {
      brandSlug = 'vallejo';
      rangePrefix = 'Model Color';
    } else if (text.includes('citadel')) {
      brandSlug = 'citadel';
    } else if (text.includes('army') || text.includes('painter')) {
      brandSlug = 'army-painter';
    }
    // P3 → no brandSlug → skipped

    if (brandSlug) {
      // Brand is in a color-col th; the match data is in the next td (idx + 1)
      targets.push({ colIndex: idx + 1, brandSlug, rangePrefix });
    }
  });

  return targets;
}

// Extracts all <td> elements from a <tr> as { attrs, content } pairs
function extractCells(row: string): { attrs: string; content: string }[] {
  const cells: { attrs: string; content: string }[] = [];
  const tdRegex = /<td([^>]*)>([\s\S]*?)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = tdRegex.exec(row)) !== null) {
    cells.push({ attrs: m[1], content: m[2] });
  }
  return cells;
}

// ── Output type ───────────────────────────────────────────

export type SimilarPaintEntry = {
  paintName: string;
  paintBrand: string;
  similarPaintName: string;
  similarPaintBrand: string;
  source: string;
};

// ── Scraping ──────────────────────────────────────────────

async function scrapePage(
  pageUrl: string,
  sourceBrandSlug: string,
  sourceRangePrefix: string,
): Promise<SimilarPaintEntry[]> {
  const html = await fetchPage(pageUrl);
  const pairs: SimilarPaintEntry[] = [];

  const tableMatch = html.match(/<table[^>]*class="list-color"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) {
    console.warn(`  [WARN] No table found on ${pageUrl}`);
    return [];
  }

  const rows = tableMatch[1].split(/<tr>/);
  const headerRow = rows[1] ?? '';
  const targets = parseHeaderTargets(headerRow);

  console.log(
    `  Targets: ${targets.map((t) => `${t.brandSlug}${t.rangePrefix ? `(${t.rangePrefix})` : ''}`).join(', ')}`,
  );

  let totalRows = 0;
  let matchedSource = 0;
  let pairsFound = 0;

  for (const row of rows.slice(2)) {
    if (!row.includes('class="filled"')) continue;
    totalRows++;

    const cells = extractCells(row);
    if (cells.length === 0) continue;

    // Source paint: extract name from <strong class='owned'>Name</strong>
    const sourceNameMatch = cells[0]?.content.match(/<strong[^>]*>([^<]+)<\/strong>/);
    if (!sourceNameMatch) continue;

    const sourcePaint = findPaint(sourceBrandSlug, sourceRangePrefix, sourceNameMatch[1].trim());
    if (!sourcePaint) continue;
    matchedSource++;

    for (const target of targets) {
      const cell = cells[target.colIndex];
      if (!cell) continue;

      // Extract match name from <strong>Name</strong>
      const matchNameMatch = cell.content.match(/<strong>([^<]+)<\/strong>/);
      if (!matchNameMatch) continue;

      // Extract delta score (last number in the cell)
      const deltaMatch = cell.content.match(/([\d.]+)\s*$/);
      const delta = parseFloat(deltaMatch?.[1] ?? '99');

      if (delta > MAX_DELTA) continue;

      const targetPaint = findPaint(target.brandSlug, target.rangePrefix, matchNameMatch[1].trim());
      if (!targetPaint) continue;

      pairs.push({
        paintName: sourcePaint.name,
        paintBrand: sourcePaint.brandSlug,
        similarPaintName: targetPaint.name,
        similarPaintBrand: targetPaint.brandSlug,
        source: 'redgrimm',
      });
      pairsFound++;
    }
  }

  console.log(
    `  Rows: ${totalRows} | Source matched: ${matchedSource}/${totalRows} | Pairs found: ${pairsFound}`,
  );

  return pairs;
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  const allPairs: SimilarPaintEntry[] = [];
  // Deduplicate: key = "paintBrand:paintName|similarBrand:similarName"
  const seen = new Set<string>();

  for (const page of PAGES) {
    console.log(`\nScraping ${page.url}...`);
    const pairs = await scrapePage(page.url, page.brandSlug, page.rangePrefix);

    for (const pair of pairs) {
      const key = `${pair.paintBrand}:${pair.paintName}|${pair.similarPaintBrand}:${pair.similarPaintName}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPairs.push(pair);

        // Double-entry: also store the reverse direction
        const reverseKey = `${pair.similarPaintBrand}:${pair.similarPaintName}|${pair.paintBrand}:${pair.paintName}`;
        if (!seen.has(reverseKey)) {
          seen.add(reverseKey);
          allPairs.push({
            paintName: pair.similarPaintName,
            paintBrand: pair.similarPaintBrand,
            similarPaintName: pair.paintName,
            similarPaintBrand: pair.paintBrand,
            source: pair.source,
          });
        }
      }
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPairs, null, 2));
  console.log(`\n✅ Done — ${allPairs.length} entries written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
