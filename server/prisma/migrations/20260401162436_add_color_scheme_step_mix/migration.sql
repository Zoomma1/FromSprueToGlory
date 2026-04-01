/*
  Warnings:

  - You are about to drop the column `mix` on the `color_scheme_steps` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "color_scheme_steps" DROP COLUMN "mix",
ADD COLUMN     "isMix" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "color_scheme_step_mixes" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "paintId" TEXT,
    "userCustomPaintId" TEXT,
    "ratio" DOUBLE PRECISION,

    CONSTRAINT "color_scheme_step_mixes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "color_scheme_step_mixes_stepId_idx" ON "color_scheme_step_mixes"("stepId");

-- AddForeignKey
ALTER TABLE "color_scheme_step_mixes" ADD CONSTRAINT "color_scheme_step_mixes_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "color_scheme_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_scheme_step_mixes" ADD CONSTRAINT "color_scheme_step_mixes_paintId_fkey" FOREIGN KEY ("paintId") REFERENCES "paints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_scheme_step_mixes" ADD CONSTRAINT "color_scheme_step_mixes_userCustomPaintId_fkey" FOREIGN KEY ("userCustomPaintId") REFERENCES "user_custom_paints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
