-- AlterTable
ALTER TABLE "color_scheme_steps" ADD COLUMN     "stepImageKey" TEXT;

-- CreateTable
CREATE TABLE "color_scheme_images" (
    "id" TEXT NOT NULL,
    "colorSchemeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "color_scheme_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "color_scheme_images_colorSchemeId_idx" ON "color_scheme_images"("colorSchemeId");

-- AddForeignKey
ALTER TABLE "color_scheme_images" ADD CONSTRAINT "color_scheme_images_colorSchemeId_fkey" FOREIGN KEY ("colorSchemeId") REFERENCES "color_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
