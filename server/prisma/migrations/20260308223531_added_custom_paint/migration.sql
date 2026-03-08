-- AlterTable
ALTER TABLE "color_scheme_steps" ADD COLUMN     "userCustomPaintId" TEXT;

-- CreateTable
CREATE TABLE "user_custom_paints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaintType",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_custom_paints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_custom_paints_userId_idx" ON "user_custom_paints"("userId");

-- AddForeignKey
ALTER TABLE "user_custom_paints" ADD CONSTRAINT "user_custom_paints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_scheme_steps" ADD CONSTRAINT "color_scheme_steps_userCustomPaintId_fkey" FOREIGN KEY ("userCustomPaintId") REFERENCES "user_custom_paints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
