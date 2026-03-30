// ──────────────────────────────────────────────────────────
// 🎨 Enrich Vallejo Paints — from RedGrimm source pages
// ──────────────────────────────────────────────────────────
// Extracts Vallejo Model Color and Game Color paint names
// from RedGrimm's source pages and adds missing ones to
// paints-full.json.
//
// USAGE: tsx scripts/enrich-vallejo-paints.ts
// ──────────────────────────────────────────────────────────

import https from 'https';
import fs from 'fs';
import path from 'path';

const PAINTS_FILE = path.join(__dirname, '../data/paints-full.json');

type Paint = { name: string; brandSlug: string; range: string; type: string; code?: string };
const paintsDb: Paint[] = JSON.parse(fs.readFileSync(PAINTS_FILE, 'utf8'));

const existingNames = new Set(paintsDb.map((p) => `${p.brandSlug}:${p.name.toLowerCase()}`));

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

// Extracts source paint names from a RedGrimm page
// Source paints are in: <td class="filled"><strong class='owned'>Name</strong><br>Brand - Range - #hex</td>
function extractSourcePaints(html: string): { name: string; range: string }[] {
  const results: { name: string; range: string }[] = [];
  const cellRegex = /<td[^>]*class="filled"[^>]*>([\s\S]*?)<\/td>/g;
  let m: RegExpExecArray | null;

  while ((m = cellRegex.exec(html)) !== null) {
    const cell = m[1];
    const nameMatch = cell.match(/<strong[^>]*>([^<]+)<\/strong>/);
    // "Vallejo - Model - #hex" or "Vallejo - Game - #hex"
    const rangeMatch = cell.match(/Vallejo - (Model|Game)/);
    if (nameMatch && rangeMatch) {
      results.push({ name: nameMatch[1].trim(), range: rangeMatch[1] });
    }
  }

  return results;
}

async function main() {
  const pages = [
    { url: 'https://redgrimm.github.io/paint-conversion/vallejo-model.html', range: 'Model Color', prefix: 'Model Color' },
    { url: 'https://redgrimm.github.io/paint-conversion/vallejo-game.html', range: 'Game Color', prefix: 'Game Color' },
  ];

  const newPaints: Paint[] = [];

  for (const page of pages) {
    console.log(`\nFetching ${page.url}...`);
    const html = await fetchPage(page.url);
    const sourcePaints = extractSourcePaints(html);
    console.log(`  Found ${sourcePaints.length} source paints`);

    let added = 0;
    for (const { name } of sourcePaints) {
      const fullName = `${page.prefix} ${name}`;
      const key = `vallejo:${fullName.toLowerCase()}`;
      if (!existingNames.has(key)) {
        existingNames.add(key); // avoid duplicates across pages
        newPaints.push({
          name: fullName,
          brandSlug: 'vallejo',
          range: page.range,
          type: 'BASE',
        });
        added++;
      }
    }
    console.log(`  New paints to add: ${added}`);
  }

  if (newPaints.length === 0) {
    console.log('\n✅ Nothing to add — paints-full.json is already up to date.');
    return;
  }

  const updated = [...paintsDb, ...newPaints];
  fs.writeFileSync(PAINTS_FILE, JSON.stringify(updated, null, 2));
  console.log(`\n✅ Added ${newPaints.length} Vallejo paints to paints-full.json (total: ${updated.length})`);
}

main().catch(console.error);
