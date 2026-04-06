-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "defaultFactionId" TEXT,
ADD COLUMN     "defaultGameSystemId" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_defaultGameSystemId_fkey" FOREIGN KEY ("defaultGameSystemId") REFERENCES "game_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_defaultFactionId_fkey" FOREIGN KEY ("defaultFactionId") REFERENCES "factions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
