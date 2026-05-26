-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userPhone" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "payChannel" TEXT NOT NULL,
    "payAmount" REAL NOT NULL,
    "earlyBirdDiscount" REAL NOT NULL DEFAULT 0,
    "giftValue" REAL NOT NULL DEFAULT 0,
    "giftShipped" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "refundAmount" REAL,
    "feeAmount" REAL,
    "actualRefund" REAL,
    "anomalies" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "giftValue" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChannelConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "feeRate" REAL NOT NULL,
    "fixedFee" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefundRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "deductFee" BOOLEAN NOT NULL DEFAULT true,
    "giftDeductRate" REAL NOT NULL DEFAULT 1,
    "earlyBirdHandling" TEXT NOT NULL DEFAULT 'full_refund',
    "customEarlyBirdRate" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefundBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ruleId" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "totalFee" REAL NOT NULL DEFAULT 0,
    "totalActualRefund" REAL NOT NULL DEFAULT 0,
    "frozenAt" DATETIME,
    "frozenBy" TEXT,
    "executedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BatchItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "snapshotRefundAmount" REAL NOT NULL,
    "snapshotFeeAmount" REAL NOT NULL,
    "snapshotActualRefund" REAL NOT NULL,
    CONSTRAINT "BatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RefundBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BatchItem_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeSnapshot" TEXT,
    "afterSnapshot" TEXT,
    "operator" TEXT NOT NULL,
    "reason" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "batchId" TEXT,
    "filters" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RefundBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_orderNo_key" ON "Participant"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConfig_channel_key" ON "ChannelConfig"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "RefundRule_name_key" ON "RefundRule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BatchItem_batchId_participantId_key" ON "BatchItem"("batchId", "participantId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
