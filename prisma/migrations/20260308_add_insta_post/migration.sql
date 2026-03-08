-- CreateTable
CREATE TABLE "InstaPost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "postId" TEXT,
    "username" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "imageUrl" TEXT,
    "permalink" TEXT NOT NULL,
    "likes" TEXT,
    "timestamp" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstaPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstaPost_postId_key" ON "InstaPost"("postId");

-- AddForeignKey
ALTER TABLE "InstaPost" ADD CONSTRAINT "InstaPost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
