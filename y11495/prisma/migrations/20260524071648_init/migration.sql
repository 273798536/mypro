-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "frozenBy" TEXT,
    "frozenAt" DATETIME,
    "frozenReason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "approvedNote" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "SourceFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceFile_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "sourceRowNo" INTEGER NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "taxAmount" REAL,
    "totalAmount" REAL NOT NULL,
    "sellerName" TEXT,
    "sellerTaxNo" TEXT,
    "buyerName" TEXT,
    "buyerTaxNo" TEXT,
    "invoiceType" TEXT,
    "travelDateStart" DATETIME,
    "travelDateEnd" DATETIME,
    "hotelName" TEXT,
    "checkInDate" DATETIME,
    "checkOutDate" DATETIME,
    "guestNames" TEXT,
    "rawData" TEXT,
    "parsedBy" TEXT,
    "parsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TravelApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "sourceRowNo" INTEGER NOT NULL,
    "appNo" TEXT NOT NULL,
    "applicant" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "travelStart" DATETIME NOT NULL,
    "travelEnd" DATETIME NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" TEXT,
    "travelers" TEXT,
    "estimatedAccommodation" REAL,
    "estimatedTransport" REAL,
    "estimatedOther" REAL,
    "estimatedTotal" REAL,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelApplication_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TravelApplication_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "sourceRowNo" INTEGER NOT NULL,
    "paymentNo" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "payee" TEXT,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT,
    "remark" TEXT,
    "relatedInvoiceNo" TEXT,
    "relatedAppNo" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "severity" INTEGER NOT NULL DEFAULT 2,
    "description" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedBy" TEXT,
    "confirmedAt" DATETIME,
    "confirmedBy" TEXT,
    "confirmedNote" TEXT,
    "overruledAt" DATETIME,
    "overruledBy" TEXT,
    "overruleReason" TEXT,
    "dismissedAt" DATETIME,
    "dismissedBy" TEXT,
    "dismissReason" TEXT,
    "disputedAt" DATETIME,
    "disputedBy" TEXT,
    "disputeReason" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    CONSTRAINT "AuditException_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExceptionInvoice" (
    "exceptionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reason" TEXT,

    PRIMARY KEY ("exceptionId", "invoiceId"),
    CONSTRAINT "ExceptionInvoice_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "AuditException" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExceptionInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    CONSTRAINT "StatusHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "batchId" TEXT,
    "userId" TEXT,
    "username" TEXT,
    "userRole" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "exportedBy" TEXT NOT NULL,
    "exportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "statusBefore" TEXT NOT NULL,
    "statusAfter" TEXT,
    "note" TEXT,
    CONSTRAINT "ExportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchNo_key" ON "Batch"("batchNo");
