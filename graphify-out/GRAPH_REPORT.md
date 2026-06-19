# Graph Report - FromSprueToGlory  (2026-06-19)

## Corpus Check
- 178 files · ~199,960 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1148 nodes · 1702 edges · 101 communities (84 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc3c69e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 75 edges
2. `SchemeDetailComponent` - 45 edges
3. `AuthService` - 27 edges
4. `createApp()` - 20 edges
5. `ValidationError` - 19 edges
6. `Item` - 17 edges
7. `asyncHandler()` - 15 edges
8. `SearchableSelectComponent` - 15 edges
9. `PaintCollectionComponent` - 14 edges
10. `PaintConverterComponent` - 14 edges

## Surprising Connections (you probably didn't know these)
- `createApp()` --calls--> `cors`  [INFERRED]
  server/src/app.ts → /Users/vico/dev/FromSprueToGlory/server/package.json
- `createApp()` --calls--> `express`  [INFERRED]
  server/src/app.ts → /Users/vico/dev/FromSprueToGlory/server/package.json
- `createApp()` --calls--> `helmet`  [INFERRED]
  server/src/app.ts → /Users/vico/dev/FromSprueToGlory/server/package.json
- `createApp()` --calls--> `asyncHandler()`  [EXTRACTED]
  server/src/app.ts → server/src/lib/async-handler.ts
- `authMiddleware()` --calls--> `trackUserActivity()`  [EXTRACTED]
  server/src/middleware/auth.middleware.ts → server/src/services/user-activity.service.ts

## Communities (101 total, 17 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (45): dependencies, @angular/animations, @angular/cdk, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/material (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (33): getResend(), sendPasswordResetEmail(), ConflictError, UnauthorizedError, configurePassport(), changePasswordSchema, forgotPassword(), forgotPasswordSchema (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (40): description, devDependencies, eslint, @eslint/js, prettier, prisma, supertest, tsx (+32 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (11): q, SearchableSelectComponent, onChangeSpy, onTouchedSpy, spy, TestOption, testOptions, brands (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (16): EXCHANGE_RATES, byProject, currency, DashboardComponent, eligibleItems, projectBreakdown, alpha, beta (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (20): activatedRouteStub, adapted, brands, created, group, mockCustomPaint, mockPaints, mockPaintsWithBrands (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (12): asyncHandler(), router, data, router, tokens, router, userId, router (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (12): addSchemeImageSchema, createScheme(), createSchemeSchema, deleteS3Key(), deleteScheme(), mixEntrySchema, removeSchemeImage(), stepSchema (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (24): Faction, Factions, GameSystem, GameSystems, ItemStatusHistory, Model, PaintBrand, PaintBrands (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (15): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, cookie-parser, dotenv, express-rate-limit, jsonwebtoken (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (14): STATUS_WEIGHT, computeCompletion(), createProject(), createProjectSchema, deleteProject(), getProject(), listProjects(), ProjectSummary (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (17): addToWishlist(), listPaintsWithStatus(), markAsOwned(), PaintCollectionResult, PaintFilter, PaintStatus, PaintWithStatus, removeFromOwned() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (19): ColorSchemeImage, ColorSchemePayload, ColorSchemes, ColorSchemeStepFull, ColorSchemeStepPayload, MixEntryFull, MixEntryPayload, Technique (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (7): Project, Projects, mockProject, ProjectsListComponent, confirmSpy, event, mockProjects

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (8): ADMIN_USER, app, batch, mockBrand, NON_ADMIN_USER, paintWithoutRef, server, validPaint

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (13): acquisitionChannelSchema, googleLinkIntents, parsed, resolveGoogleLinkIntent(), router, token, updateSchema, userId (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (8): ACQUISITION_CHANNELS, acquisitionPeriodSchema, exportPaints(), syncPaints(), syncPaintsBodySchema, SyncResult, mockBrand, validPaint

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (8): Item, ItemPayload, Items, ItemStatus, blob, mockData, mockItems, revokeSpy

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (5): ItemFormDialogComponent, fakeFactions, fakeGameSystems, fakeProjects, mockItem

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (13): changeStatus(), createItem(), createItemSchema, deleteItem(), getHistory(), getItem(), listItems(), statusChangeSchema (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (10): AppError, getS3Client(), presignRead(), presignUpload(), presignUploadSchema, app, AUTH_HEADER, consoleSpy (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (13): Additional Resources, Building, Client, Code scaffolding, code:bash (ng serve), code:bash (ng generate component component-name), code:bash (ng generate --help), code:bash (ng build) (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.21
Nodes (10): CURRENCIES, Currency, ITEM_STATUSES, STATUS_LABELS, STATUS_ORDER, ItemCardComponent, [field, dir], missing (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (8): AK_CONFLICTS, AK_PREFIXES, EXCLUDED_TYPES, generateSimilarPaints(), main(), prisma, rgbDistance(), step()

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (10): CONVERTER_BRANDS, getAllSimilarPaints(), getFactions(), getGameSystems(), getModels(), getPaintBrands(), getPaints(), getTechniques() (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.24
Nodes (6): environment, LoginComponent, DummyComponent, routerSpy, submitPromise, AuthResponse

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (9): hexToRgb(), exportColorSchemes(), exportItems(), exportOwnedPaints(), exportQuerySchema, mockItem, mockOwnedPaintWithHex, mockOwnedPaintWithoutHex (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (10): Paint, PaintWithEquivalents, brands, row, selected, mockCitadelBlue, mockRows, result (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (11): app, mockSend, mockVerifyAccessToken, sampleImage, sampleScheme, server, updated, validMixStep (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.32
Nodes (4): globalForPrisma, deleteAccount(), app, server

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (11): app, sampleBrand, sampleFaction, sampleGameSystem, sampleModel, samplePaint, sampleSimilarPaintRow, sampleSimilarPairRow (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (8): authMiddleware(), router, userId, router, userId, router, userId, verifyAccessToken()

### Community 38 - "Community 38"
Cohesion: 0.27
Nodes (11): options, assets, browser, index, inlineStyleLanguage, outputPath, polyfills, scripts (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.27
Nodes (8): PaintCollectionResult, PaintFilter, Paints, PaintStatus, PaintWithStatus, SimilarPaint, mockResult, searchResult

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (11): ProjectDetailComponent, confirmSpy, dialogRefSpy, itemAlpha, itemMango, itemWithCopy, itemZebra, mockItem (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (10): code:bash (git clone https://github.com/Zoomma1/FromSprueToGlory.git), code:bash (cd server && npm run dev       # http://localhost:3000), Contributing, Data Sources, From Sprue to Glory, License, Running locally, Screenshots (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (7): cors, express, helmet, createApp(), app, mockVerifyAccessToken, server

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (8): ValidationError, createPaint(), createPaintSchema, deletePaint(), listPaints(), PAINT_TYPES, mockData, samplePaint

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (10): serve, production, budgets, buildTarget, fileReplacements, outputHashing, serviceWorker, builder (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (4): confirmSpy, finishedItem, itemWithCopy, mockItems

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (9): app, finished, mockVerifyAccessToken, noDesc, sampleProject, sampleProjectWithItems, server, updated (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (8): countActiveUsers(), countReturningUsers(), createMany, groupBy, userCount, userUpdate, trackUserActivity(), utcDayStart()

### Community 51 - "Community 51"
Cohesion: 0.23
Nodes (6): appConfig, routes, authGuard(), mockRoute, mockState, result

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (9): build, builder, configurations, defaultConfiguration, development, buildTarget, extractLicenses, optimization (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (9): extract-i18n, lint, test, architect, builder, builder, options, lintFilePatterns (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.39
Nodes (8): importFactions(), importModels(), importPaints(), loadFile(), main(), parseArgs(), parseCSV(), prisma

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, module, outDir, skipLibCheck, strict, target, include

### Community 56 - "Community 56"
Cohesion: 0.22
Nodes (7): logoutReq, mockAuthResponse, p1, p2, p3, promise, req

### Community 57 - "Community 57"
Cohesion: 0.22
Nodes (4): SignupComponent, DummyComponent, routerSpy, submitPromise

### Community 58 - "Community 58"
Cohesion: 0.25
Nodes (5): JwtInterceptor, SKIP_AUTH, firstReq, req, retryReq

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (7): cli, analytics, schematicCollections, newProjectRoot, projects, $schema, version

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (8): prefix, projectType, root, schematics, sourceRoot, client, style, @schematics/angular:component

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (5): badge, nextBtn, prevBtn, spy, tags

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (6): app, itemWithDefaults, mockVerifyAccessToken, sampleItem, server, updated

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (6): app, mockVerifyAccessToken, samplePaint, samplePaint2, samplePaint3, server

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (6): brandId, factionId, gameSystemId, q, router, type

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (5): paintId, rawFilter, router, userId, VALID_FILTERS

### Community 68 - "Community 68"
Cohesion: 0.24
Nodes (4): ColorScheme, ColorSchemeFull, ColorSchemesListComponent, mockColorSchemes

### Community 69 - "Community 69"
Cohesion: 0.53
Nodes (5): main(), prisma, seedReferenceData(), seedSimilarPaints(), seedTestData()

### Community 70 - "Community 70"
Cohesion: 0.40
Nodes (4): main(), PaintWithRgb, prisma, rgbDistance()

### Community 71 - "Community 71"
Cohesion: 0.33
Nodes (5): app, mockUser, mockVerifyAccessToken, server, supported

### Community 72 - "Community 72"
Cohesion: 0.47
Nodes (4): PaginationParams, paginationSchema, params, result

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (4): angular, { defineConfig }, eslint, tseslint

### Community 74 - "Community 74"
Cohesion: 0.70
Nodes (4): detect_type(), fetch_file(), main(), parse_table()

### Community 75 - "Community 75"
Cohesion: 0.40
Nodes (4): app, AUTH_HEADER, mockItem, server

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (4): app, AUTH_HEADER, mockCustomPaint, server

### Community 77 - "Community 77"
Cohesion: 0.20
Nodes (4): ForbiddenError, NotFoundError, adminMiddleware(), userSelect

### Community 78 - "Community 78"
Cohesion: 0.40
Nodes (4): compilerOptions, rootDir, extends, include

### Community 79 - "Community 79"
Cohesion: 0.50
Nodes (3): assetGroups, index, $schema

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (3): id, router, userId

### Community 96 - "Community 96"
Cohesion: 0.40
Nodes (4): args, command, mcpServers, graphify

### Community 97 - "Community 97"
Cohesion: 0.50
Nodes (3): code:bash (graphify claude install   # PreToolUse hook + this CLAUDE.md), graphify, graphify — first-time setup (after clone)

## Knowledge Gaps
- **504 isolated node(s):** `command`, `args`, `PreToolUse`, `allow`, `name` (+499 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiService` connect `Community 0` to `Community 32`, `Community 68`, `Community 39`, `Community 8`, `Community 41`, `Community 7`, `Community 11`, `Community 15`, `Community 16`, `Community 48`, `Community 22`, `Community 23`, `Community 27`, `Community 61`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `createApp()` connect `Community 44` to `Community 64`, `Community 65`, `Community 34`, `Community 3`, `Community 36`, `Community 35`, `Community 71`, `Community 9`, `Community 75`, `Community 76`, `Community 49`, `Community 18`, `Community 19`, `Community 25`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 12` to `Community 4`, `Community 44`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createApp()` (e.g. with `express` and `helmet`) actually correct?**
  _`createApp()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `command`, `args`, `PreToolUse` to the rest of the system?**
  _504 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._