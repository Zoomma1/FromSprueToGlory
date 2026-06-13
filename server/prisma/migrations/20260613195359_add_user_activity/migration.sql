-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "route" TEXT,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_activities_userId_timestamp_idx" ON "user_activities"("userId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "user_activities_userId_day_key" ON "user_activities"("userId", "day");

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
