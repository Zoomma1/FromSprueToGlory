// ──────────────────────────────────────────────────────────
// 🎨 Generate Similar Paints from hex color distance
// ──────────────────────────────────────────────────────────
// Computes cross-brand paint pairs by RGB euclidean distance.
// Cross-brand only — same-brand pairs are not useful for substitution.
// Double-entry per ADR-012 (A→B and B→A).
//
// USAGE:
//   tsx scripts/generate-similar-paints.ts --preview
//   tsx scripts/generate-similar-paints.ts --threshold 30
// ──────────────────────────────────────────────────────────

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_THRESHOLD = 30;

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbDistance(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

type PaintWithRgb = {
    id: string;
    name: string;
    hex: string;
    brandSlug: string;
    rgb: [number, number, number];
};

async function main() {
    const args = process.argv.slice(2);
    const isPreview = args.includes('--preview');
    const thresholdIdx = args.indexOf('--threshold');
    const threshold = thresholdIdx >= 0 ? parseInt(args[thresholdIdx + 1]) : DEFAULT_THRESHOLD;

    console.log(`\n🎨 Similar Paints Generator`);
    console.log(`   Mode     : ${isPreview ? 'preview (no DB write)' : 'insert'}`);
    if (!isPreview) console.log(`   Threshold: ≤ ${threshold}`);

    const rawPaints = await prisma.paint.findMany({
        where: {
            hex: { not: null },
            type: { notIn: ['VARNISH', 'PRIMER', 'TEXTURE'] },
        },
        select: { id: true, name: true, hex: true, brand: { select: { slug: true } } },
    });

    const paints: PaintWithRgb[] = rawPaints.map((p) => ({
        id: p.id,
        name: p.name,
        hex: p.hex!,
        brandSlug: p.brand.slug,
        rgb: hexToRgb(p.hex!),
    }));

    const totalPairs = Math.floor((paints.length * (paints.length - 1)) / 2);
    console.log(`\n   Paints with hex : ${paints.length}`);
    console.log(`   Pairs to compute: ~${(totalPairs / 1000).toFixed(0)}k\n`);

    if (isPreview) {
        const thresholds = [15, 20, 30, 40, 50];
        const counts: Record<number, number> = Object.fromEntries(thresholds.map((t) => [t, 0]));

        // Collect samples for 3 reference Citadel paints
        const refNames = ['black', 'white', 'red'];
        const refs = refNames
            .map((kw) => paints.find((p) => p.brandSlug === 'citadel' && p.name.toLowerCase().includes(kw)))
            .filter(Boolean) as PaintWithRgb[];

        const samples: Map<string, { paint: PaintWithRgb; dist: number }[]> = new Map(
            refs.map((r) => [r.id, []]),
        );

        for (let i = 0; i < paints.length; i++) {
            for (let j = i + 1; j < paints.length; j++) {
                const a = paints[i];
                const b = paints[j];
                if (a.brandSlug === b.brandSlug) continue;

                const dist = rgbDistance(a.rgb, b.rgb);
                thresholds.forEach((t) => { if (dist <= t) counts[t]++; });

                for (const ref of refs) {
                    const other = a.id === ref.id ? b : b.id === ref.id ? a : null;
                    if (other) samples.get(ref.id)!.push({ paint: other, dist });
                }
            }
        }

        console.log('📊 Cross-brand pairs per threshold:');
        thresholds.forEach((t) =>
            console.log(`   ≤ ${String(t).padStart(2)} → ${counts[t].toLocaleString().padStart(7)} pairs`),
        );

        for (const ref of refs) {
            const top = samples
                .get(ref.id)!
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 6);

            console.log(`\n🔍 Nearest cross-brand to ${ref.brandSlug}/${ref.name} (${ref.hex}):`);
            top.forEach(({ paint, dist }) =>
                console.log(`   ${dist.toFixed(1).padStart(5)}  ${paint.brandSlug}/${paint.name} (${paint.hex})`),
            );
        }

        console.log('\n👉 Rerun with --threshold <value> to insert.');
    } else {
        const pairs: { paintId: string; similarPaintId: string; distance: number }[] = [];

        for (let i = 0; i < paints.length; i++) {
            for (let j = i + 1; j < paints.length; j++) {
                const a = paints[i];
                const b = paints[j];
                if (a.brandSlug === b.brandSlug) continue;
                const dist = rgbDistance(a.rgb, b.rgb);
                if (dist <= threshold) {
                    pairs.push({ paintId: a.id, similarPaintId: b.id, distance: dist });
                    pairs.push({ paintId: b.id, similarPaintId: a.id, distance: dist });
                }
            }
        }

        console.log(`Found ${pairs.length / 2} unique pairs (${pairs.length} rows with double-entry)`);

        await prisma.similarPaint.deleteMany({ where: { source: 'auto' } });

        const result = await prisma.similarPaint.createMany({
            data: pairs.map((p) => ({ ...p, source: 'auto' })),
            skipDuplicates: true,
        });

        console.log(`✅ Inserted ${result.count} SimilarPaint rows`);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
