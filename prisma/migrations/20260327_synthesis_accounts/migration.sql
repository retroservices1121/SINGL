-- CreateTable
CREATE TABLE "SynthesisAccount" (
    "id" TEXT NOT NULL,
    "privyUserId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "walletId" TEXT,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SynthesisAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SynthesisAccount_privyUserId_key" ON "SynthesisAccount"("privyUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SynthesisAccount_accountId_key" ON "SynthesisAccount"("accountId");
