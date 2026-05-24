"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDiff = calculateDiff;
exports.formatDiff = formatDiff;
exports.objectDifference = objectDifference;
const lodash_1 = require("lodash");
function calculateDiff(oldObj, newObj) {
    const diffs = [];
    if (!oldObj && !newObj) {
        return diffs;
    }
    if (!oldObj && newObj) {
        Object.entries(newObj).forEach(([key, value]) => {
            diffs.push({
                field: key,
                oldValue: undefined,
                newValue: value,
                changeType: 'added',
            });
        });
        return diffs;
    }
    if (oldObj && !newObj) {
        Object.entries(oldObj).forEach(([key, value]) => {
            diffs.push({
                field: key,
                oldValue: value,
                newValue: undefined,
                changeType: 'removed',
            });
        });
        return diffs;
    }
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    allKeys.forEach((key) => {
        const oldVal = oldObj[key];
        const newVal = newObj[key];
        if (oldVal === undefined && newVal !== undefined) {
            diffs.push({
                field: key,
                oldValue: undefined,
                newValue: newVal,
                changeType: 'added',
            });
        }
        else if (newVal === undefined && oldVal !== undefined) {
            diffs.push({
                field: key,
                oldValue: oldVal,
                newValue: undefined,
                changeType: 'removed',
            });
        }
        else if (!(0, lodash_1.isEqual)(oldVal, newVal)) {
            diffs.push({
                field: key,
                oldValue: oldVal,
                newValue: newVal,
                changeType: 'modified',
            });
        }
    });
    return diffs;
}
function formatDiff(diffs) {
    if (diffs.length === 0) {
        return 'No changes';
    }
    return diffs
        .map((d) => {
        const changeType = d.changeType.toUpperCase();
        const oldStr = d.oldValue !== undefined ? JSON.stringify(d.oldValue) : 'undefined';
        const newStr = d.newValue !== undefined ? JSON.stringify(d.newValue) : 'undefined';
        if (d.changeType === 'added') {
            return `[${changeType}] ${d.field}: ${newStr}`;
        }
        else if (d.changeType === 'removed') {
            return `[${changeType}] ${d.field}: ${oldStr}`;
        }
        else {
            return `[${changeType}] ${d.field}: ${oldStr} -> ${newStr}`;
        }
    })
        .join('\n');
}
function objectDifference(object, base) {
    function changes(object, base) {
        return (0, lodash_1.transform)(object, (result, value, key) => {
            if (!(0, lodash_1.isEqual)(value, base[key])) {
                result[key] =
                    (0, lodash_1.isObject)(value) && (0, lodash_1.isObject)(base[key])
                        ? changes(value, base[key])
                        : value;
            }
        }, {});
    }
    return changes(object, base);
}
//# sourceMappingURL=diff.js.map