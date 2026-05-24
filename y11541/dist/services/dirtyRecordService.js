"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMissingFields = checkMissingFields;
exports.checkCrossDay = checkCrossDay;
exports.checkNameChange = checkNameChange;
exports.checkAmountConflict = checkAmountConflict;
exports.checkQuantityConflict = checkQuantityConflict;
exports.checkAllDirty = checkAllDirty;
exports.saveDirtyRecords = saveDirtyRecords;
exports.getDirtyRecords = getDirtyRecords;
exports.fixDirtyRecord = fixDirtyRecord;
exports.getUnfixedDirtyRecords = getUnfixedDirtyRecords;
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const database_1 = require("../db/database");
const userService_1 = require("./userService");
const recordService_1 = require("./recordService");
function checkMissingFields(data, source) {
    const results = [];
    const requiredFields = ['material_id', 'material_name', 'platform', 'record_date'];
    for (const field of requiredFields) {
        if (!data[field] || String(data[field]).trim() === '') {
            results.push({
                type: 'missing_field',
                field,
                expected: '非空值',
                actual: String(data[field] ?? ''),
                suggestion: `请补充必填字段: ${field}`
            });
        }
    }
    return results;
}
function checkCrossDay(data) {
    const results = [];
    const dateStr = data.record_date;
    if (dateStr) {
        const date = (0, dayjs_1.default)(dateStr);
        if (!date.isValid()) {
            results.push({
                type: 'cross_day',
                field: 'record_date',
                expected: '有效的日期格式 (YYYY-MM-DD)',
                actual: String(dateStr),
                suggestion: '请修正日期格式，例如: 2024-01-15'
            });
        }
    }
    return results;
}
function checkNameChange(data, existingRecords) {
    const results = [];
    const materialId = data.material_id;
    const materialName = data.material_name;
    const platform = data.platform;
    const sameIdRecords = existingRecords.filter(r => r.material_id === materialId && r.platform === platform);
    const differentNames = new Set(sameIdRecords
        .filter(r => r.material_name !== materialName)
        .map(r => r.material_name));
    if (differentNames.size > 0) {
        results.push({
            type: 'name_change',
            field: 'material_name',
            expected: Array.from(differentNames).join(', '),
            actual: materialName,
            suggestion: `同一素材ID在${platform}平台存在不同名称: ${Array.from(differentNames).join(', ')}。可建立别名关联或确认是否为改名。`
        });
    }
    return results;
}
function checkAmountConflict(data, existingRecords) {
    const results = [];
    const materialId = data.material_id;
    const platform = data.platform;
    const recordDate = data.record_date;
    const sameDayRecords = existingRecords.filter(r => r.material_id === materialId && r.platform === platform && r.record_date === recordDate);
    if (sameDayRecords.length > 0 && data.cost !== undefined) {
        const existingCosts = sameDayRecords
            .filter(r => r.cost !== undefined && r.cost !== null)
            .map(r => r.cost);
        if (existingCosts.length > 0) {
            const avgCost = existingCosts.reduce((a, b) => a + b, 0) / existingCosts.length;
            const newCost = Number(data.cost);
            if (Math.abs(newCost - avgCost) / avgCost > 0.5 && avgCost > 0) {
                results.push({
                    type: 'amount_conflict',
                    field: 'cost',
                    expected: `约 ${avgCost.toFixed(2)} (已有记录平均值)`,
                    actual: String(newCost),
                    suggestion: `新花费(${newCost})与历史平均值(${avgCost.toFixed(2)})差异超过50%，请确认数据准确性`
                });
            }
        }
    }
    return results;
}
function checkQuantityConflict(data, existingRecords) {
    const results = [];
    const materialId = data.material_id;
    const platform = data.platform;
    const recordDate = data.record_date;
    const sameDayRecords = existingRecords.filter(r => r.material_id === materialId && r.platform === platform && r.record_date === recordDate);
    if (sameDayRecords.length > 0) {
        if (data.impressions !== undefined) {
            const existingImpressions = sameDayRecords
                .filter(r => r.impressions !== undefined && r.impressions !== null)
                .map(r => r.impressions);
            if (existingImpressions.length > 0) {
                const avgImpressions = existingImpressions.reduce((a, b) => a + b, 0) / existingImpressions.length;
                const newImpressions = Number(data.impressions);
                if (Math.abs(newImpressions - avgImpressions) / avgImpressions > 0.5 && avgImpressions > 0) {
                    results.push({
                        type: 'quantity_conflict',
                        field: 'impressions',
                        expected: `约 ${Math.round(avgImpressions)} (已有记录平均值)`,
                        actual: String(newImpressions),
                        suggestion: `新曝光量(${newImpressions})与历史平均值(${Math.round(avgImpressions)})差异超过50%，请确认`
                    });
                }
            }
        }
    }
    return results;
}
function checkAllDirty(data, source, existingRecords) {
    return [
        ...checkMissingFields(data, source),
        ...checkCrossDay(data),
        ...checkNameChange(data, existingRecords),
        ...checkAmountConflict(data, existingRecords),
        ...checkQuantityConflict(data, existingRecords)
    ];
}
async function saveDirtyRecords(recordId, dirtyResults) {
    const now = (0, dayjs_1.default)().toISOString();
    for (const result of dirtyResults) {
        await (0, database_1.run)(`INSERT INTO dirty_records (
        id, record_id, dirty_type, field_name, expected_value, actual_value, suggestion, fixed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`, [
            (0, uuid_1.v4)(),
            recordId,
            result.type,
            result.field ?? null,
            result.expected ?? null,
            result.actual ?? null,
            result.suggestion,
            now
        ]);
    }
}
async function getDirtyRecords(recordId) {
    const rows = await (0, database_1.all)('SELECT * FROM dirty_records WHERE record_id = ? ORDER BY created_at DESC', [recordId]);
    return rows.map(r => ({ ...r, fixed: !!r.fixed }));
}
async function fixDirtyRecord(dirtyRecordId) {
    const user = await (0, userService_1.getCurrentUser)();
    const now = (0, dayjs_1.default)().toISOString();
    await (0, database_1.run)('UPDATE dirty_records SET fixed = 1, fixed_by = ?, fixed_at = ? WHERE id = ?', [user.id, now, dirtyRecordId]);
    const dirtyRecord = await (0, database_1.get)('SELECT * FROM dirty_records WHERE id = ?', [dirtyRecordId]);
    if (dirtyRecord) {
        const recordId = dirtyRecord.record_id;
        const remaining = await (0, database_1.get)('SELECT COUNT(*) as count FROM dirty_records WHERE record_id = ? AND fixed = 0', [recordId]);
        if (remaining && remaining.count === 0) {
            await (0, recordService_1.updateRecordStatus)(recordId, 'fixed', '所有脏记录已修复');
        }
    }
}
async function getUnfixedDirtyRecords() {
    return (0, database_1.all)(`
    SELECT dr.id, dr.record_id, mr.material_id, mr.material_name, mr.source_line, dr.dirty_type, dr.suggestion
    FROM dirty_records dr
    JOIN material_records mr ON dr.record_id = mr.id
    WHERE dr.fixed = 0
    ORDER BY mr.source_line, dr.created_at
  `);
}
//# sourceMappingURL=dirtyRecordService.js.map