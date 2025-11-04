-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "supply" TEXT,
    "imageUrl" TEXT,
    "creator" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" TEXT NOT NULL,
    "configAddress" TEXT NOT NULL,
    "tokenXMint" TEXT NOT NULL,
    "tokenYMint" TEXT NOT NULL,
    "lpMintAddress" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "authority" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "escrowAddress" TEXT,
    "creator" TEXT NOT NULL,
    "creationSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "expo" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oracles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "baseSymbol" TEXT NOT NULL,
    "quoteSymbol" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oracles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "marketAddress" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "filledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maker_bots" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "spread" DOUBLE PRECISION NOT NULL DEFAULT 0.001,
    "size" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "lastUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maker_bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_requests" (
    "id" TEXT NOT NULL,
    "poolSeed" TEXT NOT NULL,
    "configAddress" TEXT NOT NULL,
    "escrowAddress" TEXT NOT NULL,
    "tokenXMint" TEXT NOT NULL,
    "tokenYMint" TEXT NOT NULL,
    "amountX" TEXT NOT NULL,
    "amountY" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "creator" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "approvedBy" TEXT,
    "creationSignature" TEXT NOT NULL,
    "approvalSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pool_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_positions" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "lpMintAddress" TEXT NOT NULL,
    "lpAmount" TEXT NOT NULL,
    "sharePercent" DOUBLE PRECISION,
    "depositTxSig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidity_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_mintAddress_key" ON "tokens"("mintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "pools_configAddress_key" ON "pools"("configAddress");

-- CreateIndex
CREATE UNIQUE INDEX "pools_lpMintAddress_key" ON "pools"("lpMintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "prices_feedId_timestamp_key" ON "prices"("feedId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "oracles_name_key" ON "oracles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "oracles_feedId_key" ON "oracles"("feedId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderId_key" ON "orders"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "maker_bots_poolId_key" ON "maker_bots"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "pool_requests_poolSeed_key" ON "pool_requests"("poolSeed");

-- CreateIndex
CREATE UNIQUE INDEX "pool_requests_configAddress_key" ON "pool_requests"("configAddress");

-- CreateIndex
CREATE UNIQUE INDEX "pool_requests_escrowAddress_key" ON "pool_requests"("escrowAddress");

-- CreateIndex
CREATE UNIQUE INDEX "liquidity_positions_userAddress_poolId_key" ON "liquidity_positions"("userAddress", "poolId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_address_key" ON "admins"("address");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_tokenXMint_fkey" FOREIGN KEY ("tokenXMint") REFERENCES "tokens"("mintAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_tokenYMint_fkey" FOREIGN KEY ("tokenYMint") REFERENCES "tokens"("mintAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidity_positions" ADD CONSTRAINT "liquidity_positions_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
