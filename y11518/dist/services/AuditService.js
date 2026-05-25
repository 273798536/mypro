"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const data_source_1 = require("../data-source");
const AuditSnapshot_1 = require("../entities/AuditSnapshot");
class AuditService {
    constructor() {
        this.snapshotRepo = data_source_1.AppDataSource.getRepository(AuditSnapshot_1.AuditSnapshot);
    }
    async createSnapshot(snapshotType, targetType, targetId, data, previousData, options) {
        const snapshot = new AuditSnapshot_1.AuditSnapshot();
        snapshot.snapshotType = snapshotType;
        snapshot.targetType = targetType;
        snapshot.targetId = targetId;
        snapshot.data = this.sanitizeData(data);
        snapshot.previousData = previousData ? this.sanitizeData(previousData) : undefined;
        snapshot.operationId = options?.operationId;
        snapshot.operationName = options?.operationName;
        snapshot.operator = options?.operator;
        snapshot.remark = options?.remark;
        if (previousData) {
            snapshot.diff = this.calculateDiff(previousData, data);
        }
        return await this.snapshotRepo.save(snapshot);
    }
    sanitizeData(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            if (value instanceof Date) {
                result[key] = value.toISOString();
            }
            else if (typeof value === "bigint") {
                result[key] = value.toString();
            }
            else if (value !== undefined) {
                result[key] = value;
            }
        }
        return result;
    }
    calculateDiff(oldData, newData) {
        const differences = [];
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
        for (const key of allKeys) {
            const oldVal = oldData[key];
            const newVal = newData[key];
            if (oldVal === undefined && newVal !== undefined) {
                differences.push({
                    field: key,
                    op: "add",
                    newValue: newVal,
                    path: `/${key}`,
                });
            }
            else if (newVal === undefined && oldVal !== undefined) {
                differences.push({
                    field: key,
                    op: "remove",
                    oldValue: oldVal,
                    path: `/${key}`,
                });
            }
            else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                differences.push({
                    field: key,
                    op: "replace",
                    oldValue: oldVal,
                    newValue: newVal,
                    path: `/${key}`,
                });
            }
        }
        return differences;
    }
    async getSnapshotsByTarget(targetType, targetId) {
        return await this.snapshotRepo.find({
            where: { targetType, targetId },
            order: { createdAt: "DESC" },
        });
    }
    async getSnapshotsByOperation(operationId) {
        return await this.snapshotRepo.find({
            where: { operationId },
            order: { createdAt: "ASC" },
        });
    }
    async getSnapshotHistory(targetType, targetId, limit = 50) {
        const snapshots = await this.snapshotRepo.find({
            where: { targetType, targetId },
            order: { createdAt: "DESC" },
            take: limit,
        });
        const changeMap = new Map();
        for (const snapshot of snapshots) {
            if (snapshot.diff) {
                for (const d of snapshot.diff) {
                    const existing = changeMap.get(d.field);
                    if (existing) {
                        existing.changeCount++;
                    }
                    else {
                        changeMap.set(d.field, {
                            changeCount: 1,
                            lastChangedAt: snapshot.createdAt,
                        });
                    }
                }
            }
        }
        const changeSummary = Array.from(changeMap.entries()).map(([field, val]) => ({
            field,
            changeCount: val.changeCount,
            lastChangedAt: val.lastChangedAt,
        }));
        return { snapshots, changeSummary };
    }
    compareObjects(obj1, obj2) {
        const differences = [];
        const detailedDiff = [];
        const compare = (a, b, path = "") => {
            if (a === null && b === null)
                return;
            if (a === undefined && b === undefined)
                return;
            if (a === null || b === null || a === undefined || b === undefined) {
                differences.push(`${path}: ${a} -> ${b}`);
                detailedDiff.push({ path, oldValue: a, newValue: b });
                return;
            }
            if (typeof a !== typeof b) {
                differences.push(`${path}: type mismatch ${typeof a} vs ${typeof b}`);
                detailedDiff.push({ path, oldValue: a, newValue: b, type: "type_mismatch" });
                return;
            }
            if (typeof a === "object") {
                if (Array.isArray(a) && Array.isArray(b)) {
                    if (a.length !== b.length) {
                        differences.push(`${path}: array length ${a.length} vs ${b.length}`);
                        detailedDiff.push({ path, oldLength: a.length, newLength: b.length, type: "array_length" });
                    }
                    for (let i = 0; i < Math.max(a.length, b.length); i++) {
                        compare(a[i], b[i], `${path}[${i}]`);
                    }
                }
                else {
                    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
                    for (const key of keys) {
                        compare(a[key], b[key], path ? `${path}.${key}` : key);
                    }
                }
            }
            else if (a !== b) {
                differences.push(`${path}: ${a} -> ${b}`);
                detailedDiff.push({ path, oldValue: a, newValue: b });
            }
        };
        compare(obj1, obj2);
        return {
            isEqual: differences.length === 0,
            differences,
            detailedDiff,
        };
    }
}
exports.AuditService = AuditService;
