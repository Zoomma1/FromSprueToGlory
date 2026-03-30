// ──────────────────────────────────────────────────────────
// 🌱 Seed Script — Pre-populate Reference Data
// ──────────────────────────────────────────────────────────
// This script populates the database with:
//   - Game Systems (40K, AoS, Kill Team)
//   - Major factions per system
//   - Paint brands + common paints (Citadel MVP)
//   - Painting techniques
//
// WHY a seed script?
//   - Consistent starting data across environments
//   - Easy to reset to a known state: `npx prisma migrate reset`
//   - Reference data rarely changes (read-mostly tables)
//   - ALTERNATIVE: manual insertion via pgAdmin (error-prone, not repeatable)
//
// HOW TO RUN:
//   npm run seed              → reference data only (safe for prod / Railway)
//   npm run seed -- --test-data → reference data + test user + sample items
//
// 🎯 MINI-EXERCISE: Add a new faction to one of the game systems below.
//    Run `npm run seed` and verify it appears in pgAdmin.
// ──────────────────────────────────────────────────────────

import { PrismaClient, PaintType, ItemStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// 📚 Reference Data (safe for prod — fully idempotent)
// ═══════════════════════════════════════════════════════════

async function seedReferenceData() {
    console.log('📚 Seeding reference data...\n');

    // ─── Game Systems ─────────────────────────────────────
    const gameSystems = await Promise.all([
        prisma.gameSystem.upsert({
            where: { slug: '40k' },
            update: {},
            create: { name: 'Warhammer 40,000', slug: '40k' },
        }),
        prisma.gameSystem.upsert({
            where: { slug: 'aos' },
            update: {},
            create: { name: 'Age of Sigmar', slug: 'aos' },
        }),
        prisma.gameSystem.upsert({
            where: { slug: 'kill-team' },
            update: {},
            create: { name: 'Kill Team', slug: 'kill-team' },
        }),
    ]);

    const [wh40k, aos, killTeam] = gameSystems;
    console.log(`✅ Game Systems: ${gameSystems.length} created`);

    // ─── Factions ─────────────────────────────────────────

    const factions40k = [
        'Space Marines', 'Adepta Sororitas', 'Adeptus Mechanicus',
        'Astra Militarum', 'Custodes', 'Grey Knights',
        'Chaos Space Marines', 'Death Guard', 'Thousand Sons',
        'World Eaters', 'Chaos Daemons',
        'Orks', 'Tyranids', 'Necrons', 'T\'au Empire',
        'Aeldari', 'Drukhari', 'Genestealer Cults',
        'Leagues of Votann', 'Agents of the Imperium',
    ];

    const factionsAoS = [
        'Stormcast Eternals', 'Cities of Sigmar', 'Fyreslayers',
        'Idoneth Deepkin', 'Kharadron Overlords', 'Lumineth Realm-lords',
        'Seraphon', 'Sylvaneth', 'Daughters of Khaine',
        'Blades of Khorne', 'Disciples of Tzeentch', 'Hedonites of Slaanesh',
        'Maggotkin of Nurgle', 'Skaven', 'Slaves to Darkness',
        'Flesh-eater Courts', 'Nighthaunt', 'Ossiarch Bonereapers',
        'Soulblight Gravelords', 'Orruk Warclans', 'Gloomspite Gitz',
        'Ogor Mawtribes', 'Sons of Behemat',
    ];

    const factionsKT = [
        'Space Marines', 'Adepta Sororitas', 'Astra Militarum',
        'Adeptus Mechanicus', 'Chaos Space Marines', 'Death Guard',
        'Thousand Sons', 'Orks', 'Tyranids', 'Necrons',
        'T\'au Empire', 'Aeldari', 'Drukhari',
        'Genestealer Cults', 'Leagues of Votann',
    ];

    const allFactions = [
        ...factions40k.map((name) => ({ name, gameSystemId: wh40k.id })),
        ...factionsAoS.map((name) => ({ name, gameSystemId: aos.id })),
        ...factionsKT.map((name) => ({ name, gameSystemId: killTeam.id })),
    ];

    let factionCount = 0;
    for (const f of allFactions) {
        await prisma.faction.upsert({
            where: { name_gameSystemId: { name: f.name, gameSystemId: f.gameSystemId } },
            update: {},
            create: f,
        });
        factionCount++;
    }
    console.log(`✅ Factions: ${factionCount} created`);

    // ─── Models ───────────────────────────────────────────

    const smFaction = await prisma.faction.findFirst({ where: { name: 'Space Marines', gameSystemId: wh40k.id } });
    const orkFaction = await prisma.faction.findFirst({ where: { name: 'Orks', gameSystemId: wh40k.id } });
    const sceFaction = await prisma.faction.findFirst({ where: { name: 'Stormcast Eternals', gameSystemId: aos.id } });
    const necronFaction = await prisma.faction.findFirst({ where: { name: 'Necrons', gameSystemId: wh40k.id } });

    const sampleModels = [
        // Space Marines
        ...(smFaction ? [
            { name: 'Intercessors', factionId: smFaction.id, pointsCost: 80 },
            { name: 'Hellblasters', factionId: smFaction.id, pointsCost: 115 },
            { name: 'Captain in Gravis Armour', factionId: smFaction.id, pointsCost: 80 },
            { name: 'Redemptor Dreadnought', factionId: smFaction.id, pointsCost: 210 },
            { name: 'Eradicators', factionId: smFaction.id, pointsCost: 95 },
        ] : []),
        // Orks
        ...(orkFaction ? [
            { name: 'Boyz', factionId: orkFaction.id, pointsCost: 75 },
            { name: 'Warboss', factionId: orkFaction.id, pointsCost: 70 },
            { name: 'Deff Dread', factionId: orkFaction.id, pointsCost: 150 },
        ] : []),
        // Stormcast Eternals
        ...(sceFaction ? [
            { name: 'Vindictors', factionId: sceFaction.id, pointsCost: 130 },
            { name: 'Lord-Imperatant', factionId: sceFaction.id, pointsCost: 175 },
            { name: 'Annihilators', factionId: sceFaction.id, pointsCost: 200 },
        ] : []),
        // Necrons
        ...(necronFaction ? [
            { name: 'Warriors', factionId: necronFaction.id, pointsCost: 100 },
            { name: 'Immortals', factionId: necronFaction.id, pointsCost: 75 },
            { name: 'Overlord', factionId: necronFaction.id, pointsCost: 100 },
        ] : []),
    ];

    let modelCount = 0;
    for (const m of sampleModels) {
        await prisma.model.upsert({
            where: { name_factionId: { name: m.name, factionId: m.factionId } },
            update: {},
            create: m,
        });
        modelCount++;
    }
    console.log(`✅ Models: ${modelCount} created`);

    // ─── Paint Brands ─────────────────────────────────────

    const brands = await Promise.all([
        prisma.paintBrand.upsert({ where: { slug: 'citadel' }, update: {}, create: { name: 'Citadel', slug: 'citadel' } }),
        prisma.paintBrand.upsert({ where: { slug: 'vallejo' }, update: {}, create: { name: 'Vallejo', slug: 'vallejo' } }),
        prisma.paintBrand.upsert({ where: { slug: 'army-painter' }, update: {}, create: { name: 'Army Painter', slug: 'army-painter' } }),
        prisma.paintBrand.upsert({ where: { slug: 'ak-interactive' }, update: {}, create: { name: 'AK Interactive', slug: 'ak-interactive' } }),
        prisma.paintBrand.upsert({ where: { slug: 'pro-acryl' }, update: {}, create: { name: 'Pro Acryl', slug: 'pro-acryl' } }),
        prisma.paintBrand.upsert({ where: { slug: 'scale75' }, update: {}, create: { name: 'Scale75', slug: 'scale75' } }),
    ]);
    console.log(`✅ Paint Brands: ${brands.length} created`);

    // ─── Paints — Full dataset from paints-full.json ─────

    type PaintEntry = { name: string; brandSlug: string; type: string; code?: string };
    const paintsData: PaintEntry[] = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../data/paints-full.json'), 'utf-8'),
    );

    const brandMap = new Map(brands.map((b) => [b.slug, b]));

    let paintCount = 0;
    for (const p of paintsData) {
        const brand = brandMap.get(p.brandSlug);
        if (!brand) {
            console.warn(`  ⚠️  Skipping paint "${p.name}": brand "${p.brandSlug}" not in seed — add it to the paintBrands list first`);
            continue;
        }
        await prisma.paint.upsert({
            where: { name_brandId: { name: p.name, brandId: brand.id } },
            update: {},
            create: { name: p.name, type: p.type as PaintType, brandId: brand.id, code: p.code || null },
        });
        paintCount++;
    }
    console.log(`✅ Paints: ${paintCount} created (${brands.length} brands)`);

    // ─── Techniques ───────────────────────────────────────

    const techniques = [
        { name: 'Basecoat', description: 'Apply an even, opaque layer of paint as the foundation color' },
        { name: 'Wash', description: 'Apply a thin, heavily diluted paint into recesses to create shadows' },
        { name: 'Shade', description: 'Apply shade paint to recesses for quick and effective depth' },
        { name: 'Drybrush', description: 'Apply paint with a mostly dry brush to catch raised edges' },
        { name: 'Layer', description: 'Apply thin successive coats to build up color smoothly' },
        { name: 'Edge highlight', description: 'Paint thin lines along edges to suggest light reflection' },
        { name: 'Fine highlight', description: 'Very thin edge highlight on the sharpest corners' },
        { name: 'Glaze', description: 'Apply very thin transparent paint to tint an area or blend colors' },
        { name: 'Wet blend', description: 'Blend two wet paints directly on the model surface' },
        { name: 'Feathering', description: 'Very thin layers pulled from edge to blend transitions' },
        { name: 'Stippling', description: 'Dab paint in dots for texture or blending effects' },
        { name: 'Sponge', description: 'Use a sponge piece to dab paint for weathering or texture' },
        { name: 'Airbrush', description: 'Spray thin layers with an airbrush for smooth transitions' },
        { name: 'Zenithal prime', description: 'Prime from above with light color over dark primer for pre-shading' },
        { name: 'Oil wash', description: 'Use oil paints thinned with mineral spirits for pin washes' },
        { name: 'Enamel wash', description: 'Use enamel-based washes for weathering effects' },
        { name: 'Pigment', description: 'Apply dry pigment powders for dust, rust, or dirt effects' },
        { name: 'Varnish', description: 'Apply protective coat (matte, satin, or gloss)' },
        { name: 'Contrast', description: 'Apply contrast paint over light primer for base+shade in one step' },
        { name: 'Loaded brush', description: 'Load two colors on the brush for a blending technique' },
        { name: 'NMM (Non-Metallic Metal)', description: 'Simulate metallic reflection using non-metallic paints' },
        { name: 'OSL (Object Source Lighting)', description: 'Paint light effects emanating from a light source on the model' },
        { name: 'Weathering', description: 'Create wear, damage, or environmental effects on surfaces' },
        { name: 'Decal application', description: 'Apply waterslide transfers/decals to surfaces' },
        { name: 'Basing', description: 'Decorate the model base with texture, tufts, or scenic elements' },
        { name: 'Pin wash', description: 'Apply wash precisely into specific panel lines or recesses' },
    ];

    let techCount = 0;
    for (const t of techniques) {
        await prisma.technique.upsert({
            where: { name: t.name },
            update: { description: t.description },
            create: t,
        });
        techCount++;
    }
    console.log(`✅ Techniques: ${techCount} created`);
}

// ═══════════════════════════════════════════════════════════
// 🎨 Similar Paints (safe for prod — fully idempotent)
// ═══════════════════════════════════════════════════════════

async function seedSimilarPaints() {
    console.log('\n🎨 Seeding similar paints...\n');

    type SimilarPaintEntry = {
        paintName: string;
        paintBrand: string;
        similarPaintName: string;
        similarPaintBrand: string;
        source: string;
    };

    const similarPaintsData: SimilarPaintEntry[] = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../data/similar-paints.json'), 'utf-8'),
    );

    // Build lookup once: "brandSlug:name_lowercase" → paint id
    const allPaints = await prisma.paint.findMany({
        select: { id: true, name: true, brand: { select: { slug: true } } },
    });

    const paintLookup = new Map<string, string>();
    for (const paint of allPaints) {
        paintLookup.set(`${paint.brand.slug}:${paint.name.toLowerCase()}`, paint.id);
    }

    let count = 0;
    let skipped = 0;

    for (const entry of similarPaintsData) {
        const paintId = paintLookup.get(`${entry.paintBrand}:${entry.paintName.toLowerCase()}`);
        const similarPaintId = paintLookup.get(`${entry.similarPaintBrand}:${entry.similarPaintName.toLowerCase()}`);

        if (!paintId || !similarPaintId) {
            skipped++;
            continue;
        }

        await prisma.similarPaint.upsert({
            where: { paintId_similarPaintId: { paintId, similarPaintId } },
            update: { source: entry.source },
            create: { paintId, similarPaintId, source: entry.source },
        });
        count++;
    }

    console.log(`✅ Similar paints: ${count} seeded (${skipped} skipped — paint not found in DB)`);
}

// ═══════════════════════════════════════════════════════════
// 🧪 Test Data (local dev only — never run in prod)
// ═══════════════════════════════════════════════════════════

async function seedTestData() {
    console.log('\n🧪 Seeding test data...\n');

    // Re-fetch reference data needed to build test entities
    const wh40k = await prisma.gameSystem.findUniqueOrThrow({ where: { slug: '40k' } });
    const citadel = await prisma.paintBrand.findUniqueOrThrow({ where: { slug: 'citadel' } });

    const smFaction = await prisma.faction.findFirstOrThrow({ where: { name: 'Space Marines', gameSystemId: wh40k.id } });
    const orkFaction = await prisma.faction.findFirstOrThrow({ where: { name: 'Orks', gameSystemId: wh40k.id } });
    const necronFaction = await prisma.faction.findFirstOrThrow({ where: { name: 'Necrons', gameSystemId: wh40k.id } });

    // ─── Test User ────────────────────────────────────────

    const passwordHash = await bcrypt.hash('Test1234!', 10);
    const testUser = await prisma.user.upsert({
        where: { email: 'test@fstg.dev' },
        update: {},
        create: { email: 'test@fstg.dev', passwordHash },
    });
    console.log(`✅ Test user: ${testUser.email} (password: Test1234!)`);

    // ─── Projects ─────────────────────────────────────────

    const [projectUltramarines, projectPileOfShame] = await Promise.all([
        prisma.project.upsert({
            where: { id: 'seed-project-ultramarines' },
            update: {},
            create: {
                id: 'seed-project-ultramarines',
                userId: testUser.id,
                name: 'Ultramarines 10th Company',
                description: 'Building and painting a full 10th edition Ultramarines army.',
            },
        }),
        prisma.project.upsert({
            where: { id: 'seed-project-pile-of-shame' },
            update: {},
            create: {
                id: 'seed-project-pile-of-shame',
                userId: testUser.id,
                name: 'Pile of Shame',
                description: 'All the boxes I bought and never opened. The struggle is real.',
            },
        }),
    ]);
    console.log(`✅ Projects: 2 created`);

    // ─── Models (re-fetch) ────────────────────────────────

    const [intercessors, hellblasters, captainGravis, redemptorDread] = await Promise.all([
        prisma.model.findFirst({ where: { name: 'Intercessors', factionId: smFaction.id } }),
        prisma.model.findFirst({ where: { name: 'Hellblasters', factionId: smFaction.id } }),
        prisma.model.findFirst({ where: { name: 'Captain in Gravis Armour', factionId: smFaction.id } }),
        prisma.model.findFirst({ where: { name: 'Redemptor Dreadnought', factionId: smFaction.id } }),
    ]);

    const [orkBoyz, orkWarboss] = await Promise.all([
        prisma.model.findFirst({ where: { name: 'Boyz', factionId: orkFaction.id } }),
        prisma.model.findFirst({ where: { name: 'Warboss', factionId: orkFaction.id } }),
    ]);

    const necronWarriors = await prisma.model.findFirst({
        where: { name: 'Warriors', factionId: necronFaction.id },
    });

    // ─── Color Scheme — Classic Ultramarines ─────────────

    const [techBasecoat, techShade, techLayer, techEdge, techDrybrush] = await Promise.all([
        prisma.technique.findFirst({ where: { name: 'Basecoat' } }),
        prisma.technique.findFirst({ where: { name: 'Shade' } }),
        prisma.technique.findFirst({ where: { name: 'Layer' } }),
        prisma.technique.findFirst({ where: { name: 'Edge highlight' } }),
        prisma.technique.findFirst({ where: { name: 'Drybrush' } }),
    ]);

    const [
        paintMacraggeBlue, paintNulnOil, paintCalgarBlue,
        paintLeadbelcher, paintRunefangSteel, paintAbaddonBlack,
        paintRetributorArmour, paintReiklandFleshshade,
    ] = await Promise.all([
        prisma.paint.findFirst({ where: { name: 'Macragge Blue', brandId: citadel.id } }),
        prisma.paint.findFirst({ where: { name: 'Nuln Oil', brandId: citadel.id } }),
        prisma.paint.findFirst({ where: { name: 'Calgar Blue', brandId: citadel.id } }),
        prisma.paint.findFirst({ where: { name: 'Leadbelcher', brandId: citadel.id } }),
        prisma.paint.findFirst({ where: { name: 'Runefang Steel', brandId: citadel.id } }),
        prisma.paint.findFirst({ where: { name: 'Abaddon Black', brandId: citadel.id } }),
        prisma.paint.findFirst({ where: { name: 'Retributor Armour', brandId: citadel.id } }),
        prisma.paint.findFirst({ where: { name: 'Reikland Fleshshade', brandId: citadel.id } }),
    ]);

    const ultramarinesScheme = await prisma.colorScheme.upsert({
        where: { id: 'seed-scheme-ultramarines' },
        update: {},
        create: {
            id: 'seed-scheme-ultramarines',
            userId: testUser.id,
            name: 'Classic Ultramarines',
            gameSystemId: wh40k.id,
            factionId: smFaction.id,
            description: 'Tabletop-ready Ultramarines with Macragge Blue base, shading and highlights.',
            steps: {
                create: [
                    {
                        orderIndex: 1,
                        area: 'Armor',
                        techniqueId: techBasecoat!.id,
                        paintId: paintMacraggeBlue!.id,
                        dilution: 'normal',
                        expectedResult: 'Even, opaque blue coverage',
                    },
                    {
                        orderIndex: 2,
                        area: 'Armor',
                        techniqueId: techShade!.id,
                        paintId: paintNulnOil!.id,
                        dilution: 'normal',
                        expectedResult: 'Deep shadows in recesses',
                    },
                    {
                        orderIndex: 3,
                        area: 'Armor',
                        techniqueId: techLayer!.id,
                        paintId: paintCalgarBlue!.id,
                        dilution: 'thin',
                        expectedResult: 'Raised surfaces brightened, leaving shade in recesses',
                    },
                    {
                        orderIndex: 4,
                        area: 'Armor',
                        techniqueId: techEdge!.id,
                        paintId: paintCalgarBlue!.id,
                        dilution: 'thin',
                        tools: 'Size 0 brush',
                        expectedResult: 'Crisp edge highlights on all armor plates',
                    },
                    {
                        orderIndex: 5,
                        area: 'Metal (weapons, trim)',
                        techniqueId: techBasecoat!.id,
                        paintId: paintLeadbelcher!.id,
                        dilution: 'normal',
                        expectedResult: 'Solid metallic base',
                    },
                    {
                        orderIndex: 6,
                        area: 'Metal (weapons, trim)',
                        techniqueId: techShade!.id,
                        paintId: paintNulnOil!.id,
                        dilution: 'normal',
                        expectedResult: 'Darkened metallic recesses',
                    },
                    {
                        orderIndex: 7,
                        area: 'Metal (weapons, trim)',
                        techniqueId: techDrybrush!.id,
                        paintId: paintRunefangSteel!.id,
                        dilution: 'dry',
                        expectedResult: 'Bright metallic sheen on raised edges',
                    },
                    {
                        orderIndex: 8,
                        area: 'Gold details',
                        techniqueId: techBasecoat!.id,
                        paintId: paintRetributorArmour!.id,
                        dilution: 'normal',
                        expectedResult: 'Rich gold on shoulder pad rims and icons',
                    },
                    {
                        orderIndex: 9,
                        area: 'Gold details',
                        techniqueId: techShade!.id,
                        paintId: paintReiklandFleshshade!.id,
                        dilution: 'normal',
                        expectedResult: 'Warm shaded gold',
                    },
                    {
                        orderIndex: 10,
                        area: 'Trim & joints',
                        techniqueId: techBasecoat!.id,
                        paintId: paintAbaddonBlack!.id,
                        dilution: 'normal',
                        expectedResult: 'Clean black on knee pads, eye lenses and chest eagle base',
                    },
                ],
            },
        },
    });
    console.log(`✅ Color scheme: "${ultramarinesScheme.name}" (10 steps)`);

    // ─── Items ────────────────────────────────────────────
    // Only seed if the test user has no items yet (avoid duplicates on re-run)

    const existingItemCount = await prisma.item.count({ where: { userId: testUser.id } });

    if (existingItemCount === 0) {
        const itemsData = [
            // Project: Ultramarines
            {
                userId: testUser.id,
                name: 'Intercessors Squad',
                gameSystemId: wh40k.id,
                factionId: smFaction.id,
                modelId: intercessors?.id,
                quantity: 10,
                status: ItemStatus.WIP,
                price: 42.5,
                currency: 'EUR',
                store: 'Games Workshop',
                colorSchemeId: ultramarinesScheme.id,
                projectId: projectUltramarines.id,
                notes: 'Main battleline unit. Armor basecoated, working on shading.',
                tags: ['battleline', 'infantry', 'priority'],
            },
            {
                userId: testUser.id,
                name: 'Hellblasters Squad',
                gameSystemId: wh40k.id,
                factionId: smFaction.id,
                modelId: hellblasters?.id,
                quantity: 5,
                status: ItemStatus.ASSEMBLED,
                price: 37.5,
                currency: 'EUR',
                store: 'Games Workshop',
                projectId: projectUltramarines.id,
                notes: 'Assembled and primed grey seer. Ready for paint.',
                tags: ['elite', 'infantry'],
            },
            {
                userId: testUser.id,
                name: 'Captain in Gravis Armour',
                gameSystemId: wh40k.id,
                factionId: smFaction.id,
                modelId: captainGravis?.id,
                quantity: 1,
                status: ItemStatus.FINISHED,
                price: 27.5,
                currency: 'EUR',
                store: 'Games Workshop',
                colorSchemeId: ultramarinesScheme.id,
                projectId: projectUltramarines.id,
                notes: 'Done! Used as painting reference for the rest of the army.',
                tags: ['character', 'painted'],
            },
            {
                userId: testUser.id,
                name: 'Redemptor Dreadnought',
                gameSystemId: wh40k.id,
                factionId: smFaction.id,
                modelId: redemptorDread?.id,
                quantity: 1,
                status: ItemStatus.BOUGHT,
                price: 55.0,
                currency: 'EUR',
                store: 'Amazon',
                projectId: projectUltramarines.id,
                notes: 'Still in box. Assembly will be a project.',
                tags: ['vehicle', 'big-kit'],
            },
            // Project: Pile of Shame
            {
                userId: testUser.id,
                name: 'Boyz Mob',
                gameSystemId: wh40k.id,
                factionId: orkFaction.id,
                modelId: orkBoyz?.id,
                quantity: 20,
                status: ItemStatus.WANT,
                tags: ['battleline', 'orks', 'wishlist'],
                notes: 'I keep telling myself I\'ll start Orks one day.',
            },
            {
                userId: testUser.id,
                name: 'Warboss',
                gameSystemId: wh40k.id,
                factionId: orkFaction.id,
                modelId: orkWarboss?.id,
                quantity: 1,
                status: ItemStatus.BOUGHT,
                price: 28.0,
                currency: 'EUR',
                store: 'eBay',
                projectId: projectPileOfShame.id,
                notes: 'Got it second hand. Already cleaned the flash, that\'s it.',
                tags: ['character', 'orks'],
            },
            {
                userId: testUser.id,
                name: 'Necron Warriors',
                gameSystemId: wh40k.id,
                factionId: necronFaction.id,
                modelId: necronWarriors?.id,
                quantity: 10,
                status: ItemStatus.ASSEMBLED,
                price: 38.0,
                currency: 'EUR',
                store: 'Games Workshop',
                projectId: projectPileOfShame.id,
                notes: 'Assembled but no idea what color scheme to do.',
                tags: ['battleline', 'necrons'],
            },
        ];

        await prisma.item.createMany({ data: itemsData });
        console.log(`✅ Items: ${itemsData.length} created`);
    } else {
        console.log(`⏭️  Items: skipped (test user already has ${existingItemCount} items)`);
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 Entry Point
// ═══════════════════════════════════════════════════════════

async function main() {
    const addTestData = process.argv.includes('--test-data');

    console.log('🌱 Seeding database...\n');

    await seedReferenceData();
    await seedSimilarPaints();

    if (addTestData) {
        await seedTestData();
    }

    console.log('\n🎉 Seed complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
