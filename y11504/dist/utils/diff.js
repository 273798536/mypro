"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSensitiveFields = exports.hasChanges = exports.generateTextDiff = exports.compareObjects = void 0;
const Diff = __importStar(require("diff"));
const isEqual_1 = __importDefault(require("lodash/isEqual"));
const compareObjects = (before, after, prefix = '') => {
    const changes = [];
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const key of allKeys) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        const beforeValue = before?.[key];
        const afterValue = after?.[key];
        if (typeof beforeValue === 'object' && typeof afterValue === 'object' &&
            beforeValue !== null && afterValue !== null &&
            !Array.isArray(beforeValue) && !Array.isArray(afterValue)) {
            const nestedChanges = (0, exports.compareObjects)(beforeValue, afterValue, fieldPath);
            changes.push(...nestedChanges);
        }
        else if (!(0, isEqual_1.default)(beforeValue, afterValue)) {
            changes.push({
                field: fieldPath,
                before: beforeValue,
                after: afterValue,
            });
        }
    }
    return changes;
};
exports.compareObjects = compareObjects;
const generateTextDiff = (before, after) => {
    const diff = Diff.diffChars(before || '', after || '');
    return diff
        .map((part) => {
        if (part.added)
            return `[+${part.value}]`;
        if (part.removed)
            return `[-${part.value}]`;
        return part.value;
    })
        .join('');
};
exports.generateTextDiff = generateTextDiff;
const hasChanges = (before, after) => {
    return !(0, isEqual_1.default)(before, after);
};
exports.hasChanges = hasChanges;
const extractSensitiveFields = (data, sensitiveFields) => {
    const result = {};
    for (const field of sensitiveFields) {
        const value = getNestedValue(data, field);
        if (value !== undefined) {
            result[field] = value;
        }
    }
    return result;
};
exports.extractSensitiveFields = extractSensitiveFields;
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
};
//# sourceMappingURL=diff.js.map