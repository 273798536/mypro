import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Database, InspectionRecord, ReworkOrder, VerdictHistory, YieldRecord, Defect } from './types';

const DB_PATH = path.join(process.cwd(), 'qc-data.json');
const BACKUP_DIR = path.join(process.cwd(), '.qc-backups');

function initializeDatabase(): Database {
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

export function loadDatabase(): Database {
  if (!fs.existsSync(DB_PATH)) {
    const db = initializeDatabase();
    saveDatabase(db);
    return db;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('数据库读取失败，使用备份或初始化新数据库');
    return initializeDatabase();
  }
}

export function saveDatabase(db: Database): void {
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

export function findInspectionByBatchId(db: Database, batchId: string): InspectionRecord | undefined {
  return db.inspections.find(i => i.batchId === batchId);
}

export function findReworkByBatchId(db: Database, reworkBatchId: string): ReworkOrder | undefined {
  return db.reworkOrders.find(r => r.reworkBatchId === reworkBatchId);
}

export function findDefectById(db: Database, defectId: string): Defect | undefined {
  for (const inspection of db.inspections) {
    const defect = inspection.defects.find(d => d.id === defectId);
    if (defect) return defect;
  }
  for (const rework of db.reworkOrders) {
    const defect = rework.newDefects.find(d => d.id === defectId);
    if (defect) return defect;
  }
  return undefined;
}

export function getCurrentVerdict(db: Database, defectId: string): VerdictHistory | undefined {
  return db.verdictHistory.find(v => v.defectId === defectId && v.isCurrent);
}

export function addInspection(db: Database, inspection: Omit<InspectionRecord, 'id'>): InspectionRecord {
  const newInspection: InspectionRecord = {
    ...inspection,
    id: uuidv4()
  };
  db.inspections.push(newInspection);
  return newInspection;
}

export function addReworkOrder(db: Database, rework: Omit<ReworkOrder, 'id' | 'importedAt'>): ReworkOrder {
  const newRework: ReworkOrder = {
    ...rework,
    id: uuidv4(),
    importedAt: new Date().toISOString()
  };
  db.reworkOrders.push(newRework);
  return newRework;
}

export function addVerdict(db: Database, verdict: Omit<VerdictHistory, 'id' | 'isCurrent'>): VerdictHistory {
  db.verdictHistory.forEach(v => {
    if (v.defectId === verdict.defectId) {
      v.isCurrent = false;
    }
  });

  const newVerdict: VerdictHistory = {
    ...verdict,
    id: uuidv4(),
    isCurrent: true
  };
  db.verdictHistory.push(newVerdict);
  return newVerdict;
}

export function addYieldRecord(db: Database, yieldRecord: Omit<YieldRecord, 'id' | 'calculatedAt'>): YieldRecord {
  const newYield: YieldRecord = {
    ...yieldRecord,
    id: uuidv4(),
    calculatedAt: new Date().toISOString()
  };
  db.yieldRecords.push(newYield);
  return newYield;
}

export function findSimilarDefects(db: Database, defectType: string, productCode?: string): Defect[] {
  const similar: Defect[] = [];
  
  for (const inspection of db.inspections) {
    if (productCode && inspection.productCode !== productCode) continue;
    for (const defect of inspection.defects) {
      if (defect.defectType === defectType) {
        similar.push(defect);
      }
    }
  }
  
  for (const rework of db.reworkOrders) {
    if (productCode && rework.productCode !== productCode) continue;
    for (const defect of rework.newDefects) {
      if (defect.defectType === defectType) {
        similar.push(defect);
      }
    }
  }
  
  return similar;
}

export function getAllDefects(db: Database): Defect[] {
  const defects: Defect[] = [];
  const seenIds = new Set<string>();

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

export function updateDefectMerge(db: Database, targetDefectId: string, sourceDefectIds: string[]): void {
  const target = findDefectById(db, targetDefectId);
  if (!target) return;

  for (const sourceId of sourceDefectIds) {
    if (!target.mergedFrom.includes(sourceId)) {
      target.mergedFrom.push(sourceId);
    }
  }
  
  target.lastUpdatedAt = new Date().toISOString();
  target.reworkCount += sourceDefectIds.length;
}
