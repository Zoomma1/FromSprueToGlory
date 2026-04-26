// ──────────────────────────────────────────────────────────
// migrate-dataset.ts — FSTG Paint Dataset Migration
// ──────────────────────────────────────────────────────────
// Runs all paint dataset steps in order with a single command.
//
// Steps:
//   1. Cleanup duplicate paints (typographic apostrophes)
//   2. Delete AK Interactive conflicting short-name entries
//   3. Normalize AK Interactive prefixed names
//   4. Import arcturus-paints.json (upsert hex + new paints)
//   5. Regenerate similar paint pairs (threshold 30, no N+1)
//
// USAGE: npx tsx scripts/migrate-dataset.ts
// ──────────────────────────────────────────────────────────

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, PaintType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const THRESHOLD = 30;
const CURLY_QUOTES = /['‘’‚‛]/g;
const AK_PREFIXES = ['AK Interactive ', 'AK INTERACTIVE ', 'AK Real Colors ', 'AK REAL COLORS ', 'AK '];
const AK_CONFLICTS = ['White', 'Black', 'Light Grey', 'Dark Grey', 'Olive Green', 'Sand', 'Khaki', 'Dark Brown'];
const EXCLUDED_TYPES: PaintType[] = ['VARNISH', 'PRIMER', 'TEXTURE'];

// ─── Helpers ──────────────────────────────────────────────

async function step(label: string, fn: () => Promise<void>) {
    console.log(`\n▶ ${label}`);
    await fn();
}

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbDistance(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

// ─── Step 1: Cleanup duplicate paints ─────────────────────

async function cleanupDuplicates() {
    const curlyPaints = await prisma.paint.findMany({
        where: { OR: [{ name: { contains: '‘' } }, { name: { contains: '’' } }] },
        include: { brand: { select: { slug: true } } },
    });

    console.log(`  Found ${curlyPaints.length} paints with typographic apostrophes`);
    if (curlyPaints.length === 0) return;

    const toDelete: string[] = [];
    for (const paint of curlyPaints) {
        const normalizedName = paint.name.replace(CURLY_QUOTES, "'");
        const straight = await prisma.paint.findUnique({
            where: { name_brandId: { name: normalizedName, brandId: paint.brandId } },
        });
        if (straight) toDelete.push(paint.id);
    }

    if (toDelete.length > 0) {
        await prisma.paint.deleteMany({ where: { id: { in: toDelete } } });
        console.log(`  ✓ Deleted ${toDelete.length} duplicates (cascade removed their SimilarPaint rows)`);
    } else {
        console.log('  ✓ No duplicates to remove');
    }
}

// ─── Step 2: Delete AK conflicts ──────────────────────────

async function deleteAkConflicts() {
    const brand = await prisma.paintBrand.findUnique({ where: { slug: 'ak-interactive' } });
    if (!brand) { console.log('  ✓ AK Interactive brand not found, skipping'); return; }

    let deleted = 0;
    for (const name of AK_CONFLICTS) {
        const paint = await prisma.paint.findUnique({
            where: { name_brandId: { name, brandId: brand.id } },
            include: { _count: { select: { userOwnedPaints: true, colorSchemeSteps: true, userWishlistPaints: true } } },
        });
        if (!paint) continue;

        const refs = paint._count.userOwnedPaints + paint._count.colorSchemeSteps + paint._count.userWishlistPaints;
        if (refs > 0) {
            console.log(`  skip "${name}" — ${refs} user references`);
            continue;
        }

        await prisma.paint.delete({ where: { id: paint.id } });
        deleted++;
    }

    console.log(`  ✓ Deleted ${deleted} conflicting AK entries`);
}

// ─── Step 3: Normalize AK names ───────────────────────────

async function normalizeAkNames() {
    const brand = await prisma.paintBrand.findUnique({ where: { slug: 'ak-interactive' } });
    if (!brand) { console.log('  ✓ AK Interactive brand not found, skipping'); return; }

    const akPaints = await prisma.paint.findMany({ where: { brandId: brand.id } });
    let renamed = 0;

    for (const paint of akPaints) {
        const normalized = AK_PREFIXES.reduce<string | null>(
            (acc, prefix) => acc ?? (paint.name.startsWith(prefix) ? paint.name.slice(prefix.length) : null),
            null,
        );
        if (!normalized) continue;

        const conflict = await prisma.paint.findUnique({
            where: { name_brandId: { name: normalized, brandId: brand.id } },
        });
        if (conflict) continue;

        await prisma.paint.update({ where: { id: paint.id }, data: { name: normalized } });
        renamed++;
    }

    console.log(`  ✓ Renamed ${renamed} AK paints`);
}

// ─── Step 4: Import arcturus-paints.json ──────────────────

async function importPaints() {
    const filePath = path.resolve(__dirname, '../data/arcturus-paints.json');
    if (!fs.existsSync(filePath)) {
        console.log('  ✗ data/arcturus-paints.json not found — run parse-arcturus.py first');
        return;
    }

    const records: { name: string; brandSlug: string; type: string; code?: string; hex?: string }[] =
        JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const brandCache = new Map<string, string>(); // slug → id
    let upserted = 0;
    let skipped = 0;

    for (const r of records) {
        if (!brandCache.has(r.brandSlug)) {
            const brand = await prisma.paintBrand.findUnique({ where: { slug: r.brandSlug } });
            if (!brand) { skipped++; continue; }
            brandCache.set(r.brandSlug, brand.id);
        }

        const brandId = brandCache.get(r.brandSlug)!;
        const paintType = (r.type as PaintType) || PaintType.OTHER;

        await prisma.paint.upsert({
            where: { name_brandId: { name: r.name, brandId } },
            update: { hex: r.hex || undefined, code: r.code || undefined },
            create: { name: r.name, brandId, type: paintType, code: r.code || null, hex: r.hex || null },
        });
        upserted++;
    }

    console.log(`  ✓ Upserted ${upserted} paints (${skipped} skipped — brand not in DB)`);
}

// ─── Step 5: Generate similar paints ──────────────────────

async function generateSimilarPaints() {
    type PaintRow = { id: string; name: string; hex: string; brandSlug: string; rgb: [number, number, number] };

    const rawPaints = await prisma.paint.findMany({
        where: { hex: { not: null }, type: { notIn: EXCLUDED_TYPES } },
        select: { id: true, name: true, hex: true, brand: { select: { slug: true } } },
    });

    const paints: PaintRow[] = rawPaints.map((p) => ({
        id: p.id,
        name: p.name,
        hex: p.hex!,
        brandSlug: p.brand.slug,
        rgb: hexToRgb(p.hex!),
    }));

    console.log(`  ${paints.length} paints with hex · computing ~${Math.floor(paints.length * (paints.length - 1) / 2000)}k pairs...`);

    const pairs: { paintId: string; similarPaintId: string; distance: number }[] = [];
    for (let i = 0; i < paints.length; i++) {
        for (let j = i + 1; j < paints.length; j++) {
            const a = paints[i];
            const b = paints[j];
            if (a.brandSlug === b.brandSlug) continue;
            const dist = rgbDistance(a.rgb, b.rgb);
            if (dist <= THRESHOLD) {
                pairs.push({ paintId: a.id, similarPaintId: b.id, distance: dist });
                pairs.push({ paintId: b.id, similarPaintId: a.id, distance: dist });
            }
        }
    }

    console.log(`  Found ${pairs.length / 2} unique pairs · clearing old auto pairs...`);
    await prisma.similarPaint.deleteMany({ where: { source: 'auto' } });

    const result = await prisma.similarPaint.createMany({
        data: pairs.map((p) => ({ ...p, source: 'auto' })),
        skipDuplicates: true,
    });

    console.log(`  ✓ Inserted ${result.count} SimilarPaint rows`);
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
    console.log('🎨 FSTG Paint Dataset Migration');
    console.log('================================');

    await step('1. Cleanup duplicate paints (curly apostrophes)', cleanupDuplicates);
    await step('2. Delete AK Interactive conflicting entries', deleteAkConflicts);
    await step('3. Normalize AK Interactive prefixed names', normalizeAkNames);
    await step('4. Import arcturus-paints.json', importPaints);
    await step('5. Generate similar paint pairs (threshold: ≤ 30)', generateSimilarPaints);

    console.log('\n✅ Migration complete');
}

main()
    .catch((e) => { console.error('\n❌ Migration failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
