"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExternalReceipt = exports.validateReceiptPhoto = exports.validatePartScan = exports.validateRepairOrder = exports.validateLedgerData = void 0;
const enums_1 = require("../types/enums");
const validateLedgerData = (data) => {
    const errors = [];
    const warnings = [];
    const requiredFields = ['ledgerNo', 'engineerId'];
    for (const field of requiredFields) {
        if (!data[field]) {
            errors.push({
                field,
                message: `${field} is required`,
                code: 'REQUIRED_FIELD',
                severity: 'error',
            });
        }
    }
    if (data.engineerId && !/^[A-Za-z0-9]{3,20}$/.test(data.engineerId)) {
        warnings.push({
            field: 'engineerId',
            message: 'Engineer ID format may be incorrect',
            code: 'FORMAT_WARNING',
            severity: 'warning',
        });
    }
    if (data.partScans && Array.isArray(data.partScans)) {
        data.partScans.forEach((scan, index) => {
            if (!scan.partCode) {
                errors.push({
                    field: `partScans[${index}].partCode`,
                    message: `Part scan ${index + 1} missing part code`,
                    code: 'REQUIRED_FIELD',
                    severity: 'error',
                });
            }
            if (scan.quantity !== undefined && (typeof scan.quantity !== 'number' || scan.quantity <= 0)) {
                errors.push({
                    field: `partScans[${index}].quantity`,
                    message: `Part scan ${index + 1} quantity must be greater than 0`,
                    code: 'INVALID_VALUE',
                    severity: 'error',
                });
            }
        });
    }
    if (data.receiptPhotos && Array.isArray(data.receiptPhotos)) {
        data.receiptPhotos.forEach((photo, index) => {
            if (!photo.photoUrl) {
                warnings.push({
                    field: `receiptPhotos[${index}].photoUrl`,
                    message: `Receipt photo ${index + 1} missing photo URL`,
                    code: 'MISSING_PHOTO',
                    severity: 'warning',
                });
            }
        });
    }
    let quality = enums_1.DataQuality.VALID;
    if (errors.length > 0) {
        quality = enums_1.DataQuality.INVALID;
    }
    else if (warnings.length > 0) {
        quality = enums_1.DataQuality.SUSPICIOUS;
    }
    return {
        isValid: errors.length === 0,
        quality,
        errors,
        warnings,
    };
};
exports.validateLedgerData = validateLedgerData;
const validateRepairOrder = (data) => {
    const errors = [];
    const warnings = [];
    if (!data.orderNo) {
        errors.push({
            field: 'orderNo',
            message: 'Order number is required',
            code: 'REQUIRED_FIELD',
            severity: 'error',
        });
    }
    if (data.customerPhone && !/^1[3-9]\d{9}$/.test(data.customerPhone)) {
        warnings.push({
            field: 'customerPhone',
            message: 'Customer phone format may be incorrect',
            code: 'FORMAT_WARNING',
            severity: 'warning',
        });
    }
    let quality = enums_1.DataQuality.VALID;
    if (errors.length > 0) {
        quality = enums_1.DataQuality.INVALID;
    }
    else if (warnings.length > 0) {
        quality = enums_1.DataQuality.SUSPICIOUS;
    }
    return {
        isValid: errors.length === 0,
        quality,
        errors,
        warnings,
    };
};
exports.validateRepairOrder = validateRepairOrder;
const validatePartScan = (data) => {
    const errors = [];
    const warnings = [];
    if (!data.partCode) {
        errors.push({
            field: 'partCode',
            message: 'Part code is required',
            code: 'REQUIRED_FIELD',
            severity: 'error',
        });
    }
    if (data.quantity !== undefined && (typeof data.quantity !== 'number' || data.quantity <= 0)) {
        errors.push({
            field: 'quantity',
            message: 'Quantity must be greater than 0',
            code: 'INVALID_VALUE',
            severity: 'error',
        });
    }
    let quality = enums_1.DataQuality.VALID;
    if (errors.length > 0) {
        quality = enums_1.DataQuality.INVALID;
    }
    else if (warnings.length > 0) {
        quality = enums_1.DataQuality.SUSPICIOUS;
    }
    return {
        isValid: errors.length === 0,
        quality,
        errors,
        warnings,
    };
};
exports.validatePartScan = validatePartScan;
const validateReceiptPhoto = (data) => {
    const errors = [];
    const warnings = [];
    if (!data.photoUrl) {
        errors.push({
            field: 'photoUrl',
            message: 'Photo URL is required',
            code: 'REQUIRED_FIELD',
            severity: 'error',
        });
    }
    if (data.photoUrl && !/^https?:\/\/.+/.test(data.photoUrl)) {
        warnings.push({
            field: 'photoUrl',
            message: 'Photo URL format may be incorrect',
            code: 'FORMAT_WARNING',
            severity: 'warning',
        });
    }
    let quality = enums_1.DataQuality.VALID;
    if (errors.length > 0) {
        quality = enums_1.DataQuality.INVALID;
    }
    else if (warnings.length > 0) {
        quality = enums_1.DataQuality.SUSPICIOUS;
    }
    return {
        isValid: errors.length === 0,
        quality,
        errors,
        warnings,
    };
};
exports.validateReceiptPhoto = validateReceiptPhoto;
const validateExternalReceipt = (data) => {
    const errors = [];
    const warnings = [];
    if (!data.receiptNo && !data.content) {
        warnings.push({
            field: 'receiptNo/content',
            message: 'At least one of receipt number or content is required',
            code: 'MISSING_CONTENT',
            severity: 'warning',
        });
    }
    if (data.source && !['internal', 'external'].includes(data.source)) {
        errors.push({
            field: 'source',
            message: 'Source type must be internal or external',
            code: 'INVALID_VALUE',
            severity: 'error',
        });
    }
    let quality = enums_1.DataQuality.VALID;
    if (errors.length > 0) {
        quality = enums_1.DataQuality.INVALID;
    }
    else if (warnings.length > 0) {
        quality = enums_1.DataQuality.SUSPICIOUS;
    }
    return {
        isValid: errors.length === 0,
        quality,
        errors,
        warnings,
    };
};
exports.validateExternalReceipt = validateExternalReceipt;
//# sourceMappingURL=validation.js.map