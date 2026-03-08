-- CreateTable
CREATE TABLE "TikTok" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "videoId" TEXT,
    "username" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "thumbnail" TEXT,
    "videoUrl" TEXT NOT NULL,
    "likes" TEXT,
    "views" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TikTok_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TikTok_videoId_key" ON "TikTok"("videoId");

-- AddForeignKey
ALTER TABLE "TikTok" ADD CONSTRAINT "TikTok_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropTable (cleanup Instagram if it was created)
DROP TABLE IF EXISTS "InstaPost";
