"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.generateIdempotencyKeyFromBatch = generateIdempotencyKeyFromBatch;
const crypto_1 = __importDefault(require("crypto"));
function generateIdempotencyKey(ticketId, dataSources, sourceIds = {}) {
    const components = [
        ticketId,
        ...dataSources.sort().join(','),
        sourceIds.sessionSummaryId || '',
        sourceIds.slaRuleId || '',
        sourceIds.compensationApprovalId || '',
        sourceIds.supplierStatementId || '',
        sourceIds.approvalEmailId || ''
    ].filter(Boolean).join('|');
    return crypto_1.default.createHash('sha256').update(components).digest('hex');
}
function generateIdempotencyKeyFromBatch(batchIdentifier, batchDate) {
    const components = [batchIdentifier, batchDate].join('|');
    return crypto_1.default.createHash('sha256').update(components).digest('hex');
}
