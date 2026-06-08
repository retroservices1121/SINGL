-- CreateTable
CREATE TABLE "OraclePlayer" (
    "id" TEXT NOT NULL,
    "aggUserId" TEXT NOT NULL,
    "walletAddress" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStreakDay" TEXT,
    "sprddBalance" TEXT NOT NULL DEFAULT '0',
    "multiplierBps" INTEGER NOT NULL DEFAULT 10000,
    "balanceSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OraclePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPick" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "matchDate" TEXT NOT NULL,
    "pick" TEXT NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "correct" BOOLEAN,
    "result" TEXT,
    "awardedPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketPick" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "groupPicks" JSONB NOT NULL,
    "champion" TEXT NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "points" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardAllocation" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "pointsShare" INTEGER NOT NULL,
    "sprddAmount" TEXT NOT NULL DEFAULT '0',
    "vestStart" TIMESTAMP(3) NOT NULL,
    "vestEnd" TIMESTAMP(3) NOT NULL,
    "claimedRaw" TEXT NOT NULL DEFAULT '0',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardPeriod" (
    "id" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'daily',
    "usdBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "sprddBought" TEXT NOT NULL DEFAULT '0',
    "buybackTx" TEXT,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracleConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "OracleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OraclePlayer_aggUserId_key" ON "OraclePlayer"("aggUserId");
CREATE INDEX "OraclePlayer_totalPoints_idx" ON "OraclePlayer"("totalPoints");
CREATE INDEX "OraclePlayer_walletAddress_idx" ON "OraclePlayer"("walletAddress");

CREATE UNIQUE INDEX "MatchPick_playerId_matchId_key" ON "MatchPick"("playerId", "matchId");
CREATE INDEX "MatchPick_matchDate_idx" ON "MatchPick"("matchDate");
CREATE INDEX "MatchPick_settled_idx" ON "MatchPick"("settled");

CREATE UNIQUE INDEX "BracketPick_playerId_key" ON "BracketPick"("playerId");

CREATE INDEX "PointsLedger_playerId_idx" ON "PointsLedger"("playerId");
CREATE INDEX "PointsLedger_refId_idx" ON "PointsLedger"("refId");

CREATE UNIQUE INDEX "RewardAllocation_playerId_periodKey_key" ON "RewardAllocation"("playerId", "periodKey");
CREATE INDEX "RewardAllocation_periodKey_idx" ON "RewardAllocation"("periodKey");

CREATE UNIQUE INDEX "RewardPeriod_periodKey_key" ON "RewardPeriod"("periodKey");

CREATE UNIQUE INDEX "OracleConfig_key_key" ON "OracleConfig"("key");

-- AddForeignKey
ALTER TABLE "MatchPick" ADD CONSTRAINT "MatchPick_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "OraclePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BracketPick" ADD CONSTRAINT "BracketPick_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "OraclePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "OraclePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardAllocation" ADD CONSTRAINT "RewardAllocation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "OraclePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
