-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "storeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "dirtyCount" INTEGER NOT NULL DEFAULT 0,
    "frozenRemark" TEXT,
    "frozenAt" DATETIME,
    "frozenBy" TEXT,
    "settleRemark" TEXT,
    "settledAt" DATETIME,
    "settledBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT,
    "phone" TEXT,
    "amount" DECIMAL NOT NULL,
    "quantity" INTEGER,
    "transactionDate" DATETIME,
    "operator" TEXT,
    "originalContent" TEXT NOT NULL,
    "rawData" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dirtyType" TEXT,
    "dirtyRemark" TEXT,
    "resolveRemark" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Record_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT,
    "recordId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "operatorRole" TEXT NOT NULL,
    "operatedBy" TEXT NOT NULL,
    "operatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatusHistory_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_idempotencyKey_key" ON "Batch"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchNo_key" ON "Batch"("batchNo");

-- CreateIndex
CREATE UNIQUE INDEX "Record_idempotencyKey_key" ON "Record"("idempotencyKey");
