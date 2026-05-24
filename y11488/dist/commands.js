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
Object.defineProperty(exports, "__esModule", { value: true });
exports.importInspection = importInspection;
exports.registerRework = registerRework;
exports.mergeDefects = mergeDefects;
exports.recordVerdict = recordVerdict;
exports.recalculateYield = recalculateYield;
exports.getManagerView = getManagerView;
exports.listDefects = listDefects;
exports.showVerdictHistory = showVerdictHistory;
const fs = __importStar(require("fs"));
const uuid_1 = require("uuid");
const store_1 = require("./store");
function importInspection(filePath) {
    const db = (0, store_1.loadDatabase)();
    const warnings = [];
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if ((0, store_1.findInspectionByBatchId)(db, rawData.batchId)) {
        return {
            success: false,
            message: `批次 ${rawData.batchId} 已存在，跳过导入`
        };
    }
    const defects = (rawData.defects || []).map((d) => ({
        id: (0, uuid_1.v4)(),
        defectType: d.defectType,
        description: d.description || '',
        severity: d.severity || 'minor',
        quantity: d.quantity || 1,
        photos: (d.photos || []).map((p) => ({
            id: (0, uuid_1.v4)(),
            source: p.source || '',
            uploadedAt: p.uploadedAt || new Date().toISOString(),
            uploadedBy: p.uploadedBy || 'system',
            description: p.description
        })),
        firstFoundAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        reworkCount: 0,
        mergedFrom: []
    }));
    const machineShift = {
        machineId: rawData.machineShift.machineId,
        shift: rawData.machineShift.shift,
        shiftDate: rawData.machineShift.shiftDate,
        operator: rawData.machineShift.operator
    };
    const inspection = (0, store_1.addInspection)(db, {
        batchId: rawData.batchId,
        productCode: rawData.productCode,
        sampleSize: rawData.sampleSize,
        totalQuantity: rawData.totalQuantity,
        inspector: rawData.inspector,
        inspectedAt: rawData.inspectedAt || new Date().toISOString(),
        machineShift,
        defects,
        passRate: rawData.passRate || 0,
        isReworked: false
    });
    defects.forEach(d => {
        const similar = (0, store_1.findSimilarDefects)(db, d.defectType, rawData.productCode);
        if (similar.length > 1) {
            warnings.push(`发现同类缺陷 "${d.defectType}"，共 ${similar.length} 条记录，建议合并`);
        }
    });
    (0, store_1.saveDatabase)(db);
    return {
        success: true,
        message: `成功导入抽检记录 ${rawData.batchId}`,
        data: inspection,
        warnings
    };
}
function registerRework(filePath) {
    const db = (0, store_1.loadDatabase)();
    const warnings = [];
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const existingRework = (0, store_1.findReworkByBatchId)(db, rawData.reworkBatchId);
    if (existingRework) {
        return {
            success: false,
            message: `返工单 ${rawData.reworkBatchId} 已存在（导入时间: ${existingRework.importedAt}），跳过重复导入`
        };
    }
    const originalInspection = (0, store_1.findInspectionByBatchId)(db, rawData.originalBatchId);
    if (!originalInspection) {
        warnings.push(`未找到原始批次 ${rawData.originalBatchId} 的抽检记录`);
    }
    const newDefects = (rawData.newDefects || []).map((d) => ({
        id: (0, uuid_1.v4)(),
        defectType: d.defectType,
        description: d.description || '',
        severity: d.severity || 'minor',
        quantity: d.quantity || 1,
        photos: (d.photos || []).map((p) => ({
            id: (0, uuid_1.v4)(),
            source: p.source || '',
            uploadedAt: p.uploadedAt || new Date().toISOString(),
            uploadedBy: p.uploadedBy || 'system',
            description: p.description
        })),
        firstFoundAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        reworkCount: 0,
        mergedFrom: []
    }));
    const machineShift = {
        machineId: rawData.machineShift.machineId,
        shift: rawData.machineShift.shift,
        shiftDate: rawData.machineShift.shiftDate,
        operator: rawData.machineShift.operator
    };
    const resolvedDefectIds = rawData.resolvedDefectIds || [];
    if (originalInspection) {
        originalInspection.defects.forEach(d => {
            if (resolvedDefectIds.includes(d.id)) {
                d.reworkCount += 1;
                d.lastUpdatedAt = new Date().toISOString();
            }
        });
        originalInspection.isReworked = true;
    }
    const rework = (0, store_1.addReworkOrder)(db, {
        reworkBatchId: rawData.reworkBatchId,
        originalBatchId: rawData.originalBatchId,
        productCode: rawData.productCode,
        reworkType: rawData.reworkType,
        reworkQuantity: rawData.reworkQuantity,
        reworker: rawData.reworker,
        machineShift,
        startedAt: rawData.startedAt || new Date().toISOString(),
        completedAt: rawData.completedAt,
        status: rawData.status || 'completed',
        resolvedDefectIds,
        newDefects
    });
    (0, store_1.saveDatabase)(db);
    return {
        success: true,
        message: `成功登记返工单 ${rawData.reworkBatchId}`,
        data: rework,
        warnings
    };
}
function mergeDefects(defectType, productCode) {
    const db = (0, store_1.loadDatabase)();
    const similarDefects = (0, store_1.findSimilarDefects)(db, defectType, productCode);
    if (similarDefects.length < 2) {
        return {
            success: false,
            message: `缺陷类型 "${defectType}" 只有 ${similarDefects.length} 条记录，无需合并`
        };
    }
    const targetDefect = similarDefects.reduce((earliest, d) => d.firstFoundAt < earliest.firstFoundAt ? d : earliest);
    const sourceDefectIds = similarDefects
        .filter(d => d.id !== targetDefect.id)
        .map(d => d.id);
    (0, store_1.updateDefectMerge)(db, targetDefect.id, sourceDefectIds);
    const totalQuantity = similarDefects.reduce((sum, d) => sum + d.quantity, 0);
    targetDefect.quantity = totalQuantity;
    const allPhotos = similarDefects.flatMap(d => d.photos);
    targetDefect.photos = allPhotos.filter((p, i, arr) => arr.findIndex(x => x.source === p.source) === i);
    (0, store_1.saveDatabase)(db);
    return {
        success: true,
        message: `已合并 ${sourceDefectIds.length} 条 "${defectType}" 缺陷记录到主缺陷 ${targetDefect.id.slice(0, 8)}`,
        data: { merged: sourceDefectIds.length, targetId: targetDefect.id }
    };
}
function recordVerdict(defectId, verdict, reason, judgedBy) {
    const db = (0, store_1.loadDatabase)();
    const defect = (0, store_1.findDefectById)(db, defectId);
    if (!defect) {
        return {
            success: false,
            message: `未找到缺陷 ${defectId}`
        };
    }
    const oldVerdict = (0, store_1.getCurrentVerdict)(db, defectId);
    const photoSources = defect.photos.map(p => p.source);
    (0, store_1.addVerdict)(db, {
        defectId,
        verdict,
        reason,
        judgedBy,
        judgedAt: new Date().toISOString(),
        photoSources
    });
    (0, store_1.saveDatabase)(db);
    const oldVerdictMsg = oldVerdict
        ? `（原结论: ${oldVerdict.verdict}，由 ${oldVerdict.judgedBy} 判定）`
        : '';
    return {
        success: true,
        message: `已记录复判结论: ${verdict}${oldVerdictMsg}，保留 ${photoSources.length} 张照片来源`
    };
}
function recalculateYield() {
    const db = (0, store_1.loadDatabase)();
    const shiftMap = new Map();
    db.inspections.forEach(inspection => {
        const key = `${inspection.machineShift.machineId}-${inspection.machineShift.shift}-${inspection.machineShift.shiftDate}`;
        if (!shiftMap.has(key)) {
            shiftMap.set(key, {
                machineId: inspection.machineShift.machineId,
                shift: inspection.machineShift.shift,
                shiftDate: inspection.machineShift.shiftDate,
                batches: new Set(),
                defectIds: new Set(),
                totalProduced: 0
            });
        }
        const shiftData = shiftMap.get(key);
        shiftData.batches.add(inspection.batchId);
        shiftData.totalProduced += inspection.totalQuantity;
        inspection.defects.forEach(d => {
            if (d.mergedFrom.length === 0) {
                shiftData.defectIds.add(d.id);
            }
        });
    });
    db.reworkOrders.forEach(rework => {
        const key = `${rework.machineShift.machineId}-${rework.machineShift.shift}-${rework.machineShift.shiftDate}`;
        if (!shiftMap.has(key)) {
            shiftMap.set(key, {
                machineId: rework.machineShift.machineId,
                shift: rework.machineShift.shift,
                shiftDate: rework.machineShift.shiftDate,
                batches: new Set(),
                defectIds: new Set(),
                totalProduced: 0
            });
        }
        const shiftData = shiftMap.get(key);
        shiftData.batches.add(rework.reworkBatchId);
        rework.newDefects.forEach(d => {
            if (d.mergedFrom.length === 0) {
                shiftData.defectIds.add(d.id);
            }
        });
    });
    db.yieldRecords = [];
    shiftMap.forEach(shiftData => {
        const totalDefects = shiftData.defectIds.size;
        const passRate = shiftData.totalProduced > 0
            ? ((shiftData.totalProduced - totalDefects) / shiftData.totalProduced) * 100
            : 100;
        (0, store_1.addYieldRecord)(db, {
            machineId: shiftData.machineId,
            shift: shiftData.shift,
            shiftDate: shiftData.shiftDate,
            totalProduced: shiftData.totalProduced,
            totalDefects,
            passRate: Math.round(passRate * 100) / 100,
            includedBatchIds: Array.from(shiftData.batches),
            deduplicatedDefectIds: Array.from(shiftData.defectIds)
        });
    });
    (0, store_1.saveDatabase)(db);
    return {
        success: true,
        message: `已重算 ${shiftMap.size} 个班次的良率，缺陷已去重`,
        data: { records: db.yieldRecords.length, totalShiftCount: shiftMap.size }
    };
}
function getManagerView() {
    const db = (0, store_1.loadDatabase)();
    const allDefects = (0, store_1.getAllDefects)(db);
    const defectTypeMap = new Map();
    allDefects.forEach(d => {
        if (!defectTypeMap.has(d.defectType)) {
            defectTypeMap.set(d.defectType, {
                count: 0,
                totalQuantity: 0,
                reworkCount: 0,
                productCodes: new Set()
            });
        }
        const data = defectTypeMap.get(d.defectType);
        data.count += 1;
        data.totalQuantity += d.quantity;
        data.reworkCount += d.reworkCount;
        for (const inspection of db.inspections) {
            if (inspection.defects.some(x => x.id === d.id)) {
                data.productCodes.add(inspection.productCode);
            }
        }
    });
    const recurringDefects = Array.from(defectTypeMap.entries())
        .map(([type, data]) => ({
        type,
        count: data.count,
        totalQuantity: data.totalQuantity,
        reworkCount: data.reworkCount,
        productCodes: Array.from(data.productCodes)
    }))
        .filter(d => d.count >= 2 || d.reworkCount > 0)
        .sort((a, b) => b.count - a.count);
    const shiftPenalties = db.yieldRecords
        .filter(y => y.totalDefects > 0)
        .map(y => ({
        machineId: y.machineId,
        shift: y.shift,
        shiftDate: y.shiftDate,
        deductedDefects: y.totalDefects,
        passRate: y.passRate
    }))
        .sort((a, b) => a.passRate - b.passRate);
    const missingPhotos = [];
    allDefects.forEach(d => {
        if (d.photos.length === 0) {
            for (const inspection of db.inspections) {
                if (inspection.defects.some(x => x.id === d.id)) {
                    const verdict = (0, store_1.getCurrentVerdict)(db, d.id);
                    missingPhotos.push({
                        defectId: d.id,
                        defectType: d.defectType,
                        batchId: inspection.batchId,
                        hasVerdict: !!verdict
                    });
                }
            }
            for (const rework of db.reworkOrders) {
                if (rework.newDefects.some(x => x.id === d.id)) {
                    const verdict = (0, store_1.getCurrentVerdict)(db, d.id);
                    missingPhotos.push({
                        defectId: d.id,
                        defectType: d.defectType,
                        batchId: rework.reworkBatchId,
                        hasVerdict: !!verdict
                    });
                }
            }
        }
    });
    return {
        success: true,
        message: `生成生产经理视图：${recurringDefects.length} 类反复缺陷，${shiftPenalties.length} 个班次扣回，${missingPhotos.length} 条缺照片`,
        data: { recurringDefects, shiftPenalties, missingPhotos }
    };
}
function listDefects(defectType) {
    const db = (0, store_1.loadDatabase)();
    let defects = (0, store_1.getAllDefects)(db);
    if (defectType) {
        defects = defects.filter(d => d.defectType === defectType);
    }
    return {
        success: true,
        message: `找到 ${defects.length} 条缺陷记录`,
        data: defects
    };
}
function showVerdictHistory(defectId) {
    const db = (0, store_1.loadDatabase)();
    const history = db.verdictHistory.filter(v => v.defectId === defectId);
    if (history.length === 0) {
        return {
            success: false,
            message: `缺陷 ${defectId} 暂无复判记录`
        };
    }
    return {
        success: true,
        message: `缺陷 ${defectId} 共有 ${history.length} 条复判记录`,
        data: history
    };
}
