-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "taxAmount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "redInvoiceId" TEXT,
    "paymentPlanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_redInvoiceId_fkey" FOREIGN KEY ("redInvoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planNo" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "plannedAmount" REAL NOT NULL,
    "plannedDate" DATETIME NOT NULL,
    "actualAmount" REAL,
    "actualDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleName" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "minAdvanceDays" INTEGER NOT NULL,
    "maxAdvanceDays" INTEGER NOT NULL,
    "discountRate" REAL NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscountQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNo" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentPlanId" TEXT,
    "discountRuleId" TEXT,
    "supplierName" TEXT NOT NULL,
    "originalAmount" REAL NOT NULL,
    "discountRate" REAL NOT NULL,
    "discountAmount" REAL NOT NULL,
    "actualPayAmount" REAL NOT NULL,
    "savingAmount" REAL NOT NULL,
    "originalDueDate" DATETIME NOT NULL,
    "proposedPayDate" DATETIME NOT NULL,
    "advanceDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    CONSTRAINT "DiscountQuote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiscountQuote_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiscountQuote_discountRuleId_fkey" FOREIGN KEY ("discountRuleId") REFERENCES "DiscountRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "operationType" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "operationTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "DiscountQuote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "operator" TEXT NOT NULL,
    "operationTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    CONSTRAINT "AuditLog_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "PaymentPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "DiscountQuote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPlan_planNo_key" ON "PaymentPlan"("planNo");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountQuote_quoteNo_key" ON "DiscountQuote"("quoteNo");
