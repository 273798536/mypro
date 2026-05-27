"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareSchedules = compareSchedules;
function compareSchedules(scheduleA, scheduleB) {
    const differences = [];
    const allKeys = new Set();
    const entriesA = new Map();
    const entriesB = new Map();
    for (const entry of scheduleA.entries) {
        if (entry.shiftType !== 'off') {
            const key = `${entry.date}-${entry.shiftType}-${entry.departmentId}`;
            allKeys.add(key);
            entriesA.set(`${key}-${entry.doctorId}`, entry);
        }
    }
    for (const entry of scheduleB.entries) {
        if (entry.shiftType !== 'off') {
            const key = `${entry.date}-${entry.shiftType}-${entry.departmentId}`;
            allKeys.add(key);
            entriesB.set(`${key}-${entry.doctorId}`, entry);
        }
    }
    for (const [key, entry] of entriesA) {
        if (!entriesB.has(key)) {
            differences.push({
                date: entry.date,
                shiftType: entry.shiftType,
                departmentId: entry.departmentId,
                doctorA: entry.doctorId,
                changeType: 'removed',
            });
        }
    }
    for (const [key, entry] of entriesB) {
        if (!entriesA.has(key)) {
            differences.push({
                date: entry.date,
                shiftType: entry.shiftType,
                departmentId: entry.departmentId,
                doctorB: entry.doctorId,
                changeType: 'added',
            });
        }
    }
    return {
        scheduleA: {
            id: scheduleA.id,
            name: scheduleA.name,
            score: scheduleA.score,
            violationCount: {
                errors: scheduleA.violations.filter(v => v.severity === 'error').length,
                warnings: scheduleA.violations.filter(v => v.severity === 'warning').length,
            },
        },
        scheduleB: {
            id: scheduleB.id,
            name: scheduleB.name,
            score: scheduleB.score,
            violationCount: {
                errors: scheduleB.violations.filter(v => v.severity === 'error').length,
                warnings: scheduleB.violations.filter(v => v.severity === 'warning').length,
            },
        },
        differences,
    };
}
//# sourceMappingURL=comparison.js.map