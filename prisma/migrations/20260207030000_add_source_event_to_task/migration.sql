-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "sourceEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_sourceEventId_key" ON "Task"("sourceEventId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
