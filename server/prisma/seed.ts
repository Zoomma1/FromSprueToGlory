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
// HOW TO RUN: `npm run seed` (or `npx prisma db seed`)
//
// 🎯 MINI-EXERCISE: Add a new faction to one of the game systems below.
//    Run `npm run seed` and verify it appears in pgAdmin.
// ──────────────────────────────────────────────────────────

import { PrismaClient, PaintType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...\n');

    // ═══════════════════════════════════════════════════════
    // 🎮 Game Systems
    // ═══════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════
    // ⚔️ Factions — Major factions per game system
    // ═══════════════════════════════════════════════════════

    // --- Warhammer 40K Factions ---
    const factions40k = [
        'Space Marines', 'Adepta Sororitas', 'Adeptus Mechanicus',
        'Astra Militarum', 'Custodes', 'Grey Knights',
        'Chaos Space Marines', 'Death Guard', 'Thousand Sons',
        'World Eaters', 'Chaos Daemons',
        'Orks', 'Tyranids', 'Necrons', 'T\'au Empire',
        'Aeldari', 'Drukhari', 'Genestealer Cults',
        'Leagues of Votann', 'Agents of the Imperium',
    ];

    // --- Age of Sigmar Factions ---
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

    // --- Kill Team Factions (subset, shares with 40K) ---
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

    // ═══════════════════════════════════════════════════════
    // 🖌️ Models/Units — Sample entries per faction (MVP)
    // ═══════════════════════════════════════════════════════

    // Get some factions to link models to
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

    // ═══════════════════════════════════════════════════════
    // 🎨 Paint Brands
    // ═══════════════════════════════════════════════════════

    const brands = await Promise.all([
        prisma.paintBrand.upsert({ where: { slug: 'citadel' }, update: {}, create: { name: 'Citadel', slug: 'citadel' } }),
        prisma.paintBrand.upsert({ where: { slug: 'vallejo' }, update: {}, create: { name: 'Vallejo', slug: 'vallejo' } }),
        prisma.paintBrand.upsert({ where: { slug: 'army-painter' }, update: {}, create: { name: 'Army Painter', slug: 'army-painter' } }),
        prisma.paintBrand.upsert({ where: { slug: 'ak-interactive' }, update: {}, create: { name: 'AK Interactive', slug: 'ak-interactive' } }),
        prisma.paintBrand.upsert({ where: { slug: 'pro-acryl' }, update: {}, create: { name: 'Pro Acryl', slug: 'pro-acryl' } }),
        prisma.paintBrand.upsert({ where: { slug: 'scale75' }, update: {}, create: { name: 'Scale75', slug: 'scale75' } }),
    ]);
    const [citadel] = brands;
    console.log(`✅ Paint Brands: ${brands.length} created`);

    // ═══════════════════════════════════════════════════════
    // 🖌️ Paints — Citadel Common Set (MVP)
    // ═══════════════════════════════════════════════════════

    const citadelPaints: { name: string; type: PaintType; code?: string }[] = [
        // --- BASE ---
        { name: 'Abaddon Black', type: PaintType.BASE },
        { name: 'Averland Sunset', type: PaintType.BASE },
        { name: 'Caliban Green', type: PaintType.BASE },
        { name: 'Ceramite White', type: PaintType.BASE },
        { name: 'Kantor Blue', type: PaintType.BASE },
        { name: 'Khorne Red', type: PaintType.BASE },
        { name: 'Leadbelcher', type: PaintType.BASE },
        { name: 'Macragge Blue', type: PaintType.BASE },
        { name: 'Mephiston Red', type: PaintType.BASE },
        { name: 'Mournfang Brown', type: PaintType.BASE },
        { name: 'Naggaroth Night', type: PaintType.BASE },
        { name: 'Rakarth Flesh', type: PaintType.BASE },
        { name: 'Retributor Armour', type: PaintType.BASE },
        { name: 'Rhinox Hide', type: PaintType.BASE },
        { name: 'Wraithbone', type: PaintType.BASE },
        { name: 'Mechanicus Standard Grey', type: PaintType.BASE },
        { name: 'Zandri Dust', type: PaintType.BASE },
        { name: 'Corax White', type: PaintType.BASE },
        { name: 'Death Guard Green', type: PaintType.BASE },
        { name: 'Grey Seer', type: PaintType.BASE },
        // --- LAYER ---
        { name: 'Evil Sunz Scarlet', type: PaintType.LAYER },
        { name: 'Ushabti Bone', type: PaintType.LAYER },
        { name: 'Wild Rider Red', type: PaintType.LAYER },
        { name: 'Lothern Blue', type: PaintType.LAYER },
        { name: 'Ironbreaker', type: PaintType.LAYER },
        { name: 'Runefang Steel', type: PaintType.LAYER },
        { name: 'Liberator Gold', type: PaintType.LAYER },
        { name: 'Kislev Flesh', type: PaintType.LAYER },
        { name: 'Calgar Blue', type: PaintType.LAYER },
        { name: 'Warpstone Glow', type: PaintType.LAYER },
        { name: 'Pallid Wych Flesh', type: PaintType.LAYER },
        { name: 'Screaming Skull', type: PaintType.LAYER },
        { name: 'White Scar', type: PaintType.LAYER },
        { name: 'Auric Armour Gold', type: PaintType.LAYER },
        { name: 'Dawnstone', type: PaintType.LAYER },
        // --- SHADE (washes) ---
        { name: 'Nuln Oil', type: PaintType.SHADE },
        { name: 'Agrax Earthshade', type: PaintType.SHADE },
        { name: 'Reikland Fleshshade', type: PaintType.SHADE },
        { name: 'Druchii Violet', type: PaintType.SHADE },
        { name: 'Biel-Tan Green', type: PaintType.SHADE },
        { name: 'Drakenhof Nightshade', type: PaintType.SHADE },
        { name: 'Carroburg Crimson', type: PaintType.SHADE },
        { name: 'Seraphim Sepia', type: PaintType.SHADE },
        // --- DRY ---
        { name: 'Necron Compound', type: PaintType.DRY },
        { name: 'Ryza Rust', type: PaintType.DRY },
        { name: 'Tyrant Skull', type: PaintType.DRY },
        { name: 'Longbeard Grey', type: PaintType.DRY },
        { name: 'Sigmarite', type: PaintType.DRY },
        // --- CONTRAST ---
        { name: 'Black Templar', type: PaintType.CONTRAST },
        { name: 'Blood Angels Red', type: PaintType.CONTRAST },
        { name: 'Skeleton Horde', type: PaintType.CONTRAST },
        { name: 'Apothecary White', type: PaintType.CONTRAST },
        { name: 'Ultramarines Blue', type: PaintType.CONTRAST },
        { name: 'Snakebite Leather', type: PaintType.CONTRAST },
        { name: 'Plaguebearer Flesh', type: PaintType.CONTRAST },
        { name: 'Gore-grunta Fur', type: PaintType.CONTRAST },
        // --- TECHNICAL ---
        { name: 'Astrogranite', type: PaintType.TECHNICAL },
        { name: 'Stirland Mud', type: PaintType.TECHNICAL },
        { name: 'Blood for the Blood God', type: PaintType.TECHNICAL },
        { name: 'Nihilakh Oxide', type: PaintType.TECHNICAL },
        { name: 'Ardcoat', type: PaintType.TECHNICAL },
        { name: 'Lahmian Medium', type: PaintType.TECHNICAL },
        // --- METALLIC ---
        { name: 'Stormhost Silver', type: PaintType.METALLIC },
        { name: 'Balthasar Gold', type: PaintType.METALLIC },
        { name: 'Brass Scorpion', type: PaintType.METALLIC },
    ];

    let paintCount = 0;
    for (const p of citadelPaints) {
        await prisma.paint.upsert({
            where: { name_brandId: { name: p.name, brandId: citadel.id } },
            update: {},
            create: { name: p.name, type: p.type, brandId: citadel.id, code: p.code || null },
        });
        paintCount++;
    }
    console.log(`✅ Paints: ${paintCount} created (Citadel set)`);

    // ═══════════════════════════════════════════════════════
    // 🔧 Techniques
    // ═══════════════════════════════════════════════════════

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
