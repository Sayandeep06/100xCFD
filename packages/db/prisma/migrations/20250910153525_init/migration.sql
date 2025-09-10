-- CreateTable
CREATE TABLE "public"."trade" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "trade_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."one_min" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_min_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."five_min" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "five_min_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."one_hour" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."five_hour" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "five_hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."one_day" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trade_symbol_trade_time_idx" ON "public"."trade"("symbol", "trade_time");

-- CreateIndex
CREATE INDEX "one_min_symbol_timestamp_idx" ON "public"."one_min"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "one_min_symbol_timestamp_key" ON "public"."one_min"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "five_min_symbol_timestamp_idx" ON "public"."five_min"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "five_min_symbol_timestamp_key" ON "public"."five_min"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "one_hour_symbol_timestamp_idx" ON "public"."one_hour"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "one_hour_symbol_timestamp_key" ON "public"."one_hour"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "five_hour_symbol_timestamp_idx" ON "public"."five_hour"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "five_hour_symbol_timestamp_key" ON "public"."five_hour"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "one_day_symbol_timestamp_idx" ON "public"."one_day"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "one_day_symbol_timestamp_key" ON "public"."one_day"("symbol", "timestamp");
