// ──────────────────────────────────────────────────────────
// 📥 CSV/JSON Import Script
// ──────────────────────────────────────────────────────────
// Imports reference data (factions, models, paints) from
// CSV or JSON files into the database.
//
// USAGE:
//   npm run import -- --type factions --file data/factions-sample.csv
//   npm run import -- --type models --file data/models-sample.json
//   npm run import -- --type paints --file data/paints-sample.json
//
// WHY a separate import script?
//   - Seed script has "known" data hardcoded
//   - Import script handles EXTERNAL data from files
//   - Users can extend the DB without changing code
//   - ALTERNATIVE: Admin UI form (better UX but much more work)
//
// 🎯 MINI-EXERCISE: Create a new CSV file with 3 factions for a
//    custom game system (e.g., "Necromunda"). Import them.
// ──────────────────────────────────────────────────────────

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, PaintType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ─── Parse CLI arguments ─────────────────────────────────
function parseArgs(): { type: string; file: string } {
    const args = process.argv.slice(2);
    let type = '';
    let file = '';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--type' && args[i + 1]) type = args[++i];
        if (args[i] === '--file' && args[i + 1]) file = args[++i];
    }

    if (!type || !file) {
        console.error('Usage: npm run import -- --type <factions|models|paints> --file <path>');
        process.exit(1);
    }

    return { type, file };
}

// ─── CSV Parser (simple, no external deps) ───────────────
function parseCSV(content: string): Record<string, string>[] {
    const lines = content.trim().split('\n').map((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const record: Record<string, string> = {};
        headers.forEach((h, i) => {
            record[h] = values[i] || '';
        });
        return record;
    });
}

// ─── Load file (CSV or JSON) ─────────────────────────────
function loadFile(filePath: string): Record<string, string>[] {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
        console.error(`File not found: ${absPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    const ext = path.extname(absPath).toLowerCase();

    if (ext === '.json') {
        return JSON.parse(content);
    } else if (ext === '.csv') {
        return parseCSV(content);
    } else {
        console.error(`Unsupported file extension: ${ext} (use .csv or .json)`);
        process.exit(1);
    }
}

// ─── Import functions ────────────────────────────────────

async function importFactions(records: Record<string, string>[]) {
    console.log(`📦 Importing ${records.length} factions...`);
    let count = 0;

    for (const r of records) {
        // Find the game system by slug
        const gs = await prisma.gameSystem.findUnique({ where: { slug: r.gameSystemSlug } });
        if (!gs) {
            console.warn(`  ⚠️  Skipping "${r.name}": game system "${r.gameSystemSlug}" not found`);
            continue;
        }

        await prisma.faction.upsert({
            where: { name_gameSystemId: { name: r.name, gameSystemId: gs.id } },
            update: {},
            create: { name: r.name, gameSystemId: gs.id },
        });
        count++;
    }

    console.log(`✅ Imported ${count} factions`);
}

async function importModels(records: Record<string, string>[]) {
    console.log(`📦 Importing ${records.length} models...`);
    let count = 0;

    for (const r of records) {
        // Find faction by name + game system slug
        const gs = await prisma.gameSystem.findUnique({ where: { slug: r.gameSystemSlug } });
        if (!gs) {
            console.warn(`  ⚠️  Skipping "${r.name}": game system "${r.gameSystemSlug}" not found`);
            continue;
        }

        const faction = await prisma.faction.findFirst({
            where: { name: r.factionName, gameSystemId: gs.id },
        });
        if (!faction) {
            console.warn(`  ⚠️  Skipping "${r.name}": faction "${r.factionName}" not found in ${r.gameSystemSlug}`);
            continue;
        }

        await prisma.model.upsert({
            where: { name_factionId: { name: r.name, factionId: faction.id } },
            update: {},
            create: {
                name: r.name,
                factionId: faction.id,
                pointsCost: r.pointsCost ? parseInt(r.pointsCost, 10) : null,
            },
        });
        count++;
    }

    console.log(`✅ Imported ${count} models`);
}

async function importPaints(records: Record<string, string>[]) {
    console.log(`📦 Importing ${records.length} paints...`);
    let count = 0;

    for (const r of records) {
        const brand = await prisma.paintBrand.findUnique({ where: { slug: r.brandSlug } });
        if (!brand) {
            console.warn(`  ⚠️  Skipping "${r.name}": brand "${r.brandSlug}" not found`);
            continue;
        }

        const paintType = (r.type as PaintType) || PaintType.OTHER;

        await prisma.paint.upsert({
            where: { name_brandId: { name: r.name, brandId: brand.id } },
            update: {},
            create: {
                name: r.name,
                brandId: brand.id,
                type: paintType,
                code: r.code || null,
                notes: r.notes || null,
            },
        });
        count++;
    }

    console.log(`✅ Imported ${count} paints`);
}

// ─── Main ────────────────────────────────────────────────
async function main() {
    const { type, file } = parseArgs();
    const records = loadFile(file);

    switch (type) {
        case 'factions':
            await importFactions(records);
            break;
        case 'models':
            await importModels(records);
            break;
        case 'paints':
            await importPaints(records);
            break;
        default:
            console.error(`Unknown type: ${type}. Use: factions, models, or paints`);
            process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error('❌ Import error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
