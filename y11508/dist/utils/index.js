"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatCurrency = formatCurrency;
exports.generateNo = generateNo;
exports.delay = delay;
exports.safeJsonParse = safeJsonParse;
exports.chunkArray = chunkArray;
const dayjs_1 = __importDefault(require("dayjs"));
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!date)
        return '-';
    return (0, dayjs_1.default)(date).format(format);
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY'
    }).format(amount);
}
function generateNo(prefix, sequence) {
    return `${prefix}-${String(sequence).padStart(6, '0')}`;
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    }
    catch {
        return defaultValue;
    }
}
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
//# sourceMappingURL=index.js.map