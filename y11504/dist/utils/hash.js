"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFileHash = exports.generateLedgerNo = exports.generateDataHash = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateDataHash = (data) => {
    const sortedData = sortObjectKeys(data);
    const jsonString = JSON.stringify(sortedData);
    return crypto_1.default.createHash('sha256').update(jsonString).digest('hex');
};
exports.generateDataHash = generateDataHash;
const generateLedgerNo = (prefix = 'LDG') => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};
exports.generateLedgerNo = generateLedgerNo;
const sortObjectKeys = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj)
            .sort()
            .reduce((result, key) => {
            result[key] = sortObjectKeys(obj[key]);
            return result;
        }, {});
    }
    return obj;
};
const generateFileHash = (buffer) => {
    return crypto_1.default.createHash('md5').update(buffer).digest('hex');
};
exports.generateFileHash = generateFileHash;
//# sourceMappingURL=hash.js.map