"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.formatTimestamp = formatTimestamp;
exports.generateRunFileName = generateRunFileName;
exports.truncateText = truncateText;
exports.hashSchema = hashSchema;
const crypto_1 = __importDefault(require("crypto"));
function generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const rand = crypto_1.default.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${rand}`;
}
function formatTimestamp(ts) {
    const date = new Date(ts);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function generateRunFileName(runId, timestamp, suffix) {
    const date = new Date(timestamp);
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const timeStr = `${pad(date.getHours())}${pad(date.getMinutes())}`;
    const shortId = runId.split('_').slice(-1)[0].substring(0, 6);
    return `index_coverage_${dateStr}_${timeStr}_${shortId}.${suffix}`;
}
function truncateText(text, maxLen) {
    if (text.length <= maxLen)
        return text;
    return text.substring(0, maxLen - 3) + '...';
}
function hashSchema(obj) {
    return crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(obj))
        .digest('hex')
        .substring(0, 16);
}
//# sourceMappingURL=helpers.js.map