-- CreateTable
CREATE TABLE "similar_paints" (
    "paintId" TEXT NOT NULL,
    "similarPaintId" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "similar_paints_pkey" PRIMARY KEY ("paintId","similarPaintId")
);

-- CreateIndex
CREATE INDEX "similar_paints_paintId_idx" ON "similar_paints"("paintId");

-- AddForeignKey
ALTER TABLE "similar_paints" ADD CONSTRAINT "similar_paints_paintId_fkey" FOREIGN KEY ("paintId") REFERENCES "paints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similar_paints" ADD CONSTRAINT "similar_paints_similarPaintId_fkey" FOREIGN KEY ("similarPaintId") REFERENCES "paints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
