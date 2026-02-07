-- AlterTable
ALTER TABLE "Calendar" ADD COLUMN "syncToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_calendarId_externalId_key" ON "CalendarEvent"("calendarId", "externalId");
