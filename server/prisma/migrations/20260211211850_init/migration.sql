-- CreateEnum
CREATE TYPE "PaintType" AS ENUM ('BASE', 'LAYER', 'SHADE', 'DRY', 'CONTRAST', 'TECHNICAL', 'AIR', 'METALLIC', 'INK', 'PRIMER', 'VARNISH', 'TEXTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('WANT', 'BOUGHT', 'ASSEMBLED', 'WIP', 'FINISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_systems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "game_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameSystemId" TEXT NOT NULL,

    CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "pointsCost" INTEGER,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paint_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "paint_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "brandId" TEXT NOT NULL,
    "type" "PaintType" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,

    CONSTRAINT "paints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "techniques" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "techniques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameSystemId" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "modelId" TEXT,
    "points" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" TIMESTAMP(3),
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "store" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "status" "ItemStatus" NOT NULL DEFAULT 'WANT',
    "colorSchemeId" TEXT,
    "photoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_status_history" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromStatus" "ItemStatus" NOT NULL,
    "toStatus" "ItemStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color_schemes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameSystemId" TEXT,
    "factionId" TEXT,
    "description" TEXT,
    "referencePhotoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "color_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color_scheme_steps" (
    "id" TEXT NOT NULL,
    "colorSchemeId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "area" TEXT NOT NULL,
    "techniqueId" TEXT NOT NULL,
    "paintId" TEXT,
    "mix" TEXT,
    "dilution" TEXT,
    "tools" TEXT,
    "notes" TEXT,
    "expectedResult" TEXT,

    CONSTRAINT "color_scheme_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_systems_name_key" ON "game_systems"("name");

-- CreateIndex
CREATE UNIQUE INDEX "game_systems_slug_key" ON "game_systems"("slug");

-- CreateIndex
CREATE INDEX "factions_gameSystemId_idx" ON "factions"("gameSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "factions_name_gameSystemId_key" ON "factions"("name", "gameSystemId");

-- CreateIndex
CREATE INDEX "models_factionId_idx" ON "models"("factionId");

-- CreateIndex
CREATE UNIQUE INDEX "models_name_factionId_key" ON "models"("name", "factionId");

-- CreateIndex
CREATE UNIQUE INDEX "paint_brands_name_key" ON "paint_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "paint_brands_slug_key" ON "paint_brands"("slug");

-- CreateIndex
CREATE INDEX "paints_brandId_idx" ON "paints"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "paints_name_brandId_key" ON "paints"("name", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "techniques_name_key" ON "techniques"("name");

-- CreateIndex
CREATE INDEX "items_userId_idx" ON "items"("userId");

-- CreateIndex
CREATE INDEX "items_status_idx" ON "items"("status");

-- CreateIndex
CREATE INDEX "items_gameSystemId_idx" ON "items"("gameSystemId");

-- CreateIndex
CREATE INDEX "items_factionId_idx" ON "items"("factionId");

-- CreateIndex
CREATE INDEX "item_status_history_itemId_idx" ON "item_status_history"("itemId");

-- CreateIndex
CREATE INDEX "item_status_history_changedAt_idx" ON "item_status_history"("changedAt");

-- CreateIndex
CREATE INDEX "color_schemes_userId_idx" ON "color_schemes"("userId");

-- CreateIndex
CREATE INDEX "color_scheme_steps_colorSchemeId_idx" ON "color_scheme_steps"("colorSchemeId");

-- CreateIndex
CREATE UNIQUE INDEX "color_scheme_steps_colorSchemeId_orderIndex_key" ON "color_scheme_steps"("colorSchemeId", "orderIndex");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factions" ADD CONSTRAINT "factions_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "game_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paints" ADD CONSTRAINT "paints_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "paint_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "game_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_colorSchemeId_fkey" FOREIGN KEY ("colorSchemeId") REFERENCES "color_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_status_history" ADD CONSTRAINT "item_status_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_schemes" ADD CONSTRAINT "color_schemes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_schemes" ADD CONSTRAINT "color_schemes_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "game_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_schemes" ADD CONSTRAINT "color_schemes_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_scheme_steps" ADD CONSTRAINT "color_scheme_steps_colorSchemeId_fkey" FOREIGN KEY ("colorSchemeId") REFERENCES "color_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_scheme_steps" ADD CONSTRAINT "color_scheme_steps_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "techniques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_scheme_steps" ADD CONSTRAINT "color_scheme_steps_paintId_fkey" FOREIGN KEY ("paintId") REFERENCES "paints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
