"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspacePath = getWorkspacePath;
exports.isInitialized = isInitialized;
exports.ensureDir = ensureDir;
exports.parseNumber = parseNumber;
exports.parseBoolean = parseBoolean;
exports.formatDate = formatDate;
exports.logSuccess = logSuccess;
exports.logError = logError;
exports.logWarning = logWarning;
exports.logInfo = logInfo;
exports.safeTruncate = safeTruncate;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
function getWorkspacePath(cwd) {
    let current = cwd;
    while (true) {
        const wwiDir = path_1.default.join(current, '.wwi');
        if (fs_1.default.existsSync(wwiDir) && fs_1.default.statSync(wwiDir).isDirectory()) {
            return current;
        }
        const parent = path_1.default.dirname(current);
        if (parent === current) {
            return cwd;
        }
        current = parent;
    }
}
function isInitialized(workspacePath) {
    return fs_1.default.existsSync(path_1.default.join(workspacePath, '.wwi'));
}
function ensureDir(dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
}
function parseNumber(value) {
    if (value === undefined || value === null || value === '')
        return 0;
    if (typeof value === 'number')
        return value;
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}
function parseBoolean(value) {
    if (value === undefined || value === null)
        return false;
    if (typeof value === 'boolean')
        return value;
    const str = String(value).toLowerCase().trim();
    return ['true', '1', 'yes', 'y', '是'].includes(str);
}
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleString('zh-CN');
    }
    catch {
        return dateStr;
    }
}
function logSuccess(message) {
    console.log(chalk_1.default.green(`✓ ${message}`));
}
function logError(message) {
    console.error(chalk_1.default.red(`✗ ${message}`));
}
function logWarning(message) {
    console.log(chalk_1.default.yellow(`⚠ ${message}`));
}
function logInfo(message) {
    console.log(chalk_1.default.blue(`ℹ ${message}`));
}
function safeTruncate(str, maxLength, suffix = '...') {
    if (str === undefined || str === null)
        return '-';
    if (typeof str !== 'string')
        return String(str);
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength) + suffix;
}
