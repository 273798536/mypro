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
exports.loadDatabase = loadDatabase;
exports.saveDatabase = saveDatabase;
exports.findInspectionByBatchId = findInspectionByBatchId;
exports.findReworkByBatchId = findReworkByBatchId;
exports.findDefectById = findDefectById;
exports.getCurrentVerdict = getCurrentVerdict;
exports.addInspection = addInspection;
exports.addReworkOrder = addReworkOrder;
exports.addVerdict = addVerdict;
exports.addYieldRecord = addYieldRecord;
exports.findSimilarDefects = findSimilarDefects;
exports.getAllDefects = getAllDefects;
exports.updateDefectMerge = updateDefectMerge;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const DB_PATH = path.join(process.cwd(), 'qc-data.json');
const BACKUP_DIR = path.join(process.cwd(), '.qc-backups');
function initializeDatabase() {
    return {
        inspections: [],
        reworkOrders: [],
        verdictHistory: [],
        yieldRecords: [],
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: 1
        }
    };
}
function loadDatabase() {
    if (!fs.existsSync(DB_PATH)) {
        const db = initializeDatabase();
        saveDatabase(db);
        return db;
    }
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('数据库读取失败，使用备份或初始化新数据库');
        return initializeDatabase();
    }
}
function saveDatabase(db) {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
        const backupName = `backup-${Date.now()}-v${db.metadata.version}.json`;
        fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, backupName));
    }
    db.metadata.lastUpdated = new Date().toISOString();
    db.metadata.version += 1;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
function findInspectionByBatchId(db, batchId) {
    return db.inspections.find(i => i.batchId === batchId);
}
function findReworkByBatchId(db, reworkBatchId) {
    return db.reworkOrders.find(r => r.reworkBatchId === reworkBatchId);
}
function findDefectById(db, defectId) {
    const isShortId = defectId.length === 8;
    for (const inspection of db.inspections) {
        const defect = inspection.defects.find(d => isShortId ? d.id.startsWith(defectId) : d.id === defectId);
        if (defect)
            return defect;
    }
    for (const rework of db.reworkOrders) {
        const defect = rework.newDefects.find(d => isShortId ? d.id.startsWith(defectId) : d.id === defectId);
        if (defect)
            return defect;
    }
    return undefined;
}
function getCurrentVerdict(db, defectId) {
    const isShortId = defectId.length === 8;
    if (isShortId) {
        const defect = findDefectById(db, defectId);
        if (defect) {
            defectId = defect.id;
        }
    }
    return db.verdictHistory.find(v => v.defectId === defectId && v.isCurrent);
}
function addInspection(db, inspection) {
    const newInspection = {
        ...inspection,
        id: (0, uuid_1.v4)()
    };
    db.inspections.push(newInspection);
    return newInspection;
}
function addReworkOrder(db, rework) {
    const newRework = {
        ...rework,
        id: (0, uuid_1.v4)(),
        importedAt: new Date().toISOString()
    };
    db.reworkOrders.push(newRework);
    return newRework;
}
function addVerdict(db, verdict) {
    db.verdictHistory.forEach(v => {
        if (v.defectId === verdict.defectId) {
            v.isCurrent = false;
        }
    });
    const newVerdict = {
        ...verdict,
        id: (0, uuid_1.v4)(),
        isCurrent: true
    };
    db.verdictHistory.push(newVerdict);
    return newVerdict;
}
function addYieldRecord(db, yieldRecord) {
    const newYield = {
        ...yieldRecord,
        id: (0, uuid_1.v4)(),
        calculatedAt: new Date().toISOString()
    };
    db.yieldRecords.push(newYield);
    return newYield;
}
function findSimilarDefects(db, defectType, productCode) {
    const similar = [];
    for (const inspection of db.inspections) {
        if (productCode && inspection.productCode !== productCode)
            continue;
        for (const defect of inspection.defects) {
            if (defect.defectType === defectType) {
                similar.push(defect);
            }
        }
    }
    for (const rework of db.reworkOrders) {
        if (productCode && rework.productCode !== productCode)
            continue;
        for (const defect of rework.newDefects) {
            if (defect.defectType === defectType) {
                similar.push(defect);
            }
        }
    }
    return similar;
}
function getAllDefects(db) {
    const defects = [];
    const seenIds = new Set();
    for (const inspection of db.inspections) {
        for (const defect of inspection.defects) {
            if (!seenIds.has(defect.id)) {
                defects.push(defect);
                seenIds.add(defect.id);
            }
        }
    }
    for (const rework of db.reworkOrders) {
        for (const defect of rework.newDefects) {
            if (!seenIds.has(defect.id)) {
                defects.push(defect);
                seenIds.add(defect.id);
            }
        }
    }
    return defects;
}
function updateDefectMerge(db, targetDefectId, sourceDefectIds) {
    const target = findDefectById(db, targetDefectId);
    if (!target)
        return;
    for (const sourceId of sourceDefectIds) {
        if (!target.mergedFrom.includes(sourceId)) {
            target.mergedFrom.push(sourceId);
        }
        const sourceDefect = findDefectById(db, sourceId);
        if (sourceDefect) {
            sourceDefect.mergedInto = targetDefectId;
        }
    }
    target.lastUpdatedAt = new Date().toISOString();
    target.reworkCount += sourceDefectIds.length;
}
