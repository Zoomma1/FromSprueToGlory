-- AlterTable
ALTER TABLE "paints" ADD COLUMN     "hex" TEXT;

-- CreateTable
CREATE TABLE "user_owned_paints" (
    "userId" TEXT NOT NULL,
    "paintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_owned_paints_pkey" PRIMARY KEY ("userId","paintId")
);

-- CreateTable
CREATE TABLE "user_wishlist_paints" (
    "userId" TEXT NOT NULL,
    "paintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_wishlist_paints_pkey" PRIMARY KEY ("userId","paintId")
);

-- CreateIndex
CREATE INDEX "user_owned_paints_userId_idx" ON "user_owned_paints"("userId");

-- CreateIndex
CREATE INDEX "user_wishlist_paints_userId_idx" ON "user_wishlist_paints"("userId");

-- AddForeignKey
ALTER TABLE "user_owned_paints" ADD CONSTRAINT "user_owned_paints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_owned_paints" ADD CONSTRAINT "user_owned_paints_paintId_fkey" FOREIGN KEY ("paintId") REFERENCES "paints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wishlist_paints" ADD CONSTRAINT "user_wishlist_paints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wishlist_paints" ADD CONSTRAINT "user_wishlist_paints_paintId_fkey" FOREIGN KEY ("paintId") REFERENCES "paints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
