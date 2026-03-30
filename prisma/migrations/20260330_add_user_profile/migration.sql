-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "privyUserId" TEXT NOT NULL,
    "walletAddress" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "twitterHandle" TEXT,
    "twitterId" TEXT,
    "twitterAvatar" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_privyUserId_key" ON "UserProfile"("privyUserId");
CREATE UNIQUE INDEX "UserProfile_referralCode_key" ON "UserProfile"("referralCode");
CREATE INDEX "UserProfile_walletAddress_idx" ON "UserProfile"("walletAddress");
CREATE INDEX "UserProfile_referralCode_idx" ON "UserProfile"("referralCode");
CREATE INDEX "UserProfile_referredBy_idx" ON "UserProfile"("referredBy");
