-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "TikTok" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "TikTok_videoId_key" ON "TikTok"("videoId");

-- AddForeignKey (check if exists first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TikTok_eventId_fkey'
    ) THEN
        ALTER TABLE "TikTok" ADD CONSTRAINT "TikTok_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
