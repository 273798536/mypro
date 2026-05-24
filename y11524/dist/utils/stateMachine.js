"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransition = canTransition;
exports.getAllowedNextStates = getAllowedNextStates;
exports.isSensitiveField = isSensitiveField;
exports.maskSensitiveData = maskSensitiveData;
const types_1 = require("../types");
const allowedTransitions = [
    { from: types_1.LedgerStatus.DRAFT, to: types_1.LedgerStatus.SUBMITTED, allowedRoles: ['admin', 'area_manager', 'after_sales'] },
    { from: types_1.LedgerStatus.SUBMITTED, to: types_1.LedgerStatus.REJECTED, allowedRoles: ['admin', 'auditor'] },
    { from: types_1.LedgerStatus.SUBMITTED, to: types_1.LedgerStatus.SECOND_CONFIRM, allowedRoles: ['admin', 'auditor'] },
    { from: types_1.LedgerStatus.SUBMITTED, to: types_1.LedgerStatus.AUDIT_ONLY, allowedRoles: ['admin', 'auditor'] },
    { from: types_1.LedgerStatus.REJECTED, to: types_1.LedgerStatus.SUBMITTED, allowedRoles: ['admin', 'area_manager', 'after_sales'] },
    { from: types_1.LedgerStatus.REJECTED, to: types_1.LedgerStatus.AUDIT_ONLY, allowedRoles: ['admin', 'auditor'] },
    { from: types_1.LedgerStatus.SECOND_CONFIRM, to: types_1.LedgerStatus.AUDIT_ONLY, allowedRoles: ['admin', 'auditor'] },
    { from: types_1.LedgerStatus.SECOND_CONFIRM, to: types_1.LedgerStatus.REJECTED, allowedRoles: ['admin', 'auditor'] },
];
function canTransition(from, to, role) {
    return allowedTransitions.some(t => t.from === from && t.to === to && t.allowedRoles.includes(role));
}
function getAllowedNextStates(currentStatus, role) {
    return allowedTransitions
        .filter(t => t.from === currentStatus && t.allowedRoles.includes(role))
        .map(t => t.to);
}
function isSensitiveField(fieldName) {
    const sensitiveFields = ['customerPhone', 'customerAddress', 'reviewerPhone', 'customerName'];
    return sensitiveFields.includes(fieldName);
}
function maskSensitiveData(value, fieldName) {
    if (!isSensitiveField(fieldName))
        return value;
    if (fieldName === 'customerPhone' || fieldName === 'reviewerPhone') {
        return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    if (fieldName === 'customerName') {
        return value.length > 1 ? value[0] + '*'.repeat(value.length - 1) : value;
    }
    if (fieldName === 'customerAddress') {
        return value.replace(/(.{5}).+/, '$1***');
    }
    return value;
}
//# sourceMappingURL=stateMachine.js.map