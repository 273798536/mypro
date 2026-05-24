"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareObjects = compareObjects;
exports.formatDiff = formatDiff;
exports.printDiff = printDiff;
exports.createSnapshot = createSnapshot;
exports.deepClone = deepClone;
function compareObjects(oldObj, newObj) {
    const results = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    allKeys.forEach((key) => {
        const oldVal = oldObj?.[key];
        const newVal = newObj?.[key];
        if (oldVal === undefined && newVal !== undefined) {
            results.push({ field: key, oldValue: undefined, newValue: newVal, type: 'added' });
        }
        else if (oldVal !== undefined && newVal === undefined) {
            results.push({ field: key, oldValue: oldVal, newValue: undefined, type: 'removed' });
        }
        else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            results.push({ field: key, oldValue: oldVal, newValue: newVal, type: 'changed' });
        }
    });
    return results;
}
function formatDiff(diffs) {
    if (diffs.length === 0)
        return '无差异';
    return diffs
        .map((d) => {
        const typeSymbol = d.type === 'added' ? '+' : d.type === 'removed' ? '-' : '~';
        const oldStr = d.oldValue !== undefined ? JSON.stringify(d.oldValue) : 'undefined';
        const newStr = d.newValue !== undefined ? JSON.stringify(d.newValue) : 'undefined';
        return `${typeSymbol} ${d.field}: ${oldStr} → ${newStr}`;
    })
        .join('\n');
}
function printDiff(diffs) {
    console.log(formatDiff(diffs));
}
function createSnapshot(data) {
    return JSON.parse(JSON.stringify(data));
}
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
//# sourceMappingURL=diff.js.map