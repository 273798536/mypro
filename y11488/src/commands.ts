import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { 
  Database, InspectionRecord, ReworkOrder, Defect, CommandResult,
  ShiftType, MachineShift, VerdictHistory
} from './types';
import {
  loadDatabase, saveDatabase, findInspectionByBatchId, findReworkByBatchId,
  addInspection, addReworkOrder, addVerdict, addYieldRecord,
  findSimilarDefects, getAllDefects, updateDefectMerge, findDefectById,
  getCurrentVerdict
} from './store';

export function importInspection(filePath: string): CommandResult<InspectionRecord> {
  const db = loadDatabase();
  const warnings: string[] = [];

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (findInspectionByBatchId(db, rawData.batchId)) {
    return {
      success: false,
      message: `批次 ${rawData.batchId} 已存在，跳过导入`
    };
  }

  const defects: Defect[] = (rawData.defects || []).map((d: any) => ({
    id: uuidv4(),
    defectType: d.defectType,
    description: d.description || '',
    severity: d.severity || 'minor',
    quantity: d.quantity || 1,
    photos: (d.photos || []).map((p: any) => ({
      id: uuidv4(),
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

  const machineShift: MachineShift = {
    machineId: rawData.machineShift.machineId,
    shift: rawData.machineShift.shift as ShiftType,
    shiftDate: rawData.machineShift.shiftDate,
    operator: rawData.machineShift.operator
  };

  const inspection = addInspection(db, {
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
    const similar = findSimilarDefects(db, d.defectType, rawData.productCode);
    if (similar.length > 1) {
      warnings.push(`发现同类缺陷 "${d.defectType}"，共 ${similar.length} 条记录，建议合并`);
    }
  });

  saveDatabase(db);

  return {
    success: true,
    message: `成功导入抽检记录 ${rawData.batchId}`,
    data: inspection,
    warnings
  };
}

export function registerRework(filePath: string): CommandResult<ReworkOrder> {
  const db = loadDatabase();
  const warnings: string[] = [];

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const existingRework = findReworkByBatchId(db, rawData.reworkBatchId);
  if (existingRework) {
    return {
      success: false,
      message: `返工单 ${rawData.reworkBatchId} 已存在（导入时间: ${existingRework.importedAt}），跳过重复导入`
    };
  }

  const originalInspection = findInspectionByBatchId(db, rawData.originalBatchId);
  if (!originalInspection) {
    warnings.push(`未找到原始批次 ${rawData.originalBatchId} 的抽检记录`);
  }

  const newDefects: Defect[] = (rawData.newDefects || []).map((d: any) => ({
    id: uuidv4(),
    defectType: d.defectType,
    description: d.description || '',
    severity: d.severity || 'minor',
    quantity: d.quantity || 1,
    photos: (d.photos || []).map((p: any) => ({
      id: uuidv4(),
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

  const machineShift: MachineShift = {
    machineId: rawData.machineShift.machineId,
    shift: rawData.machineShift.shift as ShiftType,
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

  const rework = addReworkOrder(db, {
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

  saveDatabase(db);

  return {
    success: true,
    message: `成功登记返工单 ${rawData.reworkBatchId}`,
    data: rework,
    warnings
  };
}

export function mergeDefects(defectType: string, productCode?: string): CommandResult<{merged: number, targetId: string}> {
  const db = loadDatabase();

  const similarDefects = findSimilarDefects(db, defectType, productCode);
  
  if (similarDefects.length < 2) {
    return {
      success: false,
      message: `缺陷类型 "${defectType}" 只有 ${similarDefects.length} 条记录，无需合并`
    };
  }

  const targetDefect = similarDefects.reduce((earliest, d) => 
    d.firstFoundAt < earliest.firstFoundAt ? d : earliest
  );

  const sourceDefectIds = similarDefects
    .filter(d => d.id !== targetDefect.id)
    .map(d => d.id);

  updateDefectMerge(db, targetDefect.id, sourceDefectIds);
  
  const totalQuantity = similarDefects.reduce((sum, d) => sum + d.quantity, 0);
  targetDefect.quantity = totalQuantity;

  const allPhotos = similarDefects.flatMap(d => d.photos);
  targetDefect.photos = allPhotos.filter((p, i, arr) => 
    arr.findIndex(x => x.source === p.source) === i
  );

  saveDatabase(db);

  return {
    success: true,
    message: `已合并 ${sourceDefectIds.length} 条 "${defectType}" 缺陷记录到主缺陷 ${targetDefect.id.slice(0, 8)}`,
    data: { merged: sourceDefectIds.length, targetId: targetDefect.id }
  };
}

export function recordVerdict(
  defectId: string, 
  verdict: 'pass' | 'fail' | 'rework' | 'waived',
  reason: string,
  judgedBy: string
): CommandResult {
  const db = loadDatabase();

  const defect = findDefectById(db, defectId);
  if (!defect) {
    return {
      success: false,
      message: `未找到缺陷 ${defectId}`
    };
  }

  const fullDefectId = defect.id;
  const oldVerdict = getCurrentVerdict(db, fullDefectId);
  const photoSources = defect.photos.map(p => p.source);

  addVerdict(db, {
    defectId: fullDefectId,
    verdict,
    reason,
    judgedBy,
    judgedAt: new Date().toISOString(),
    photoSources
  });

  saveDatabase(db);

  const oldVerdictMsg = oldVerdict 
    ? `（原结论: ${oldVerdict.verdict}，由 ${oldVerdict.judgedBy} 判定）` 
    : '';

  return {
    success: true,
    message: `已记录复判结论: ${verdict}${oldVerdictMsg}，保留 ${photoSources.length} 张照片来源`
  };
}

export function recalculateYield(): CommandResult<{records: number, totalShiftCount: number}> {
  const db = loadDatabase();

  const shiftMap = new Map<string, {
    machineId: string;
    shift: ShiftType;
    shiftDate: string;
    batches: Set<string>;
    defectIds: Set<string>;
    totalProduced: number;
  }>();

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

    const shiftData = shiftMap.get(key)!;
    shiftData.batches.add(inspection.batchId);
    shiftData.totalProduced += inspection.totalQuantity;

    inspection.defects.forEach(d => {
      if (!d.mergedInto) {
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

    const shiftData = shiftMap.get(key)!;
    shiftData.batches.add(rework.reworkBatchId);

    rework.newDefects.forEach(d => {
      if (!d.mergedInto) {
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

    addYieldRecord(db, {
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

  saveDatabase(db);

  return {
    success: true,
    message: `已重算 ${shiftMap.size} 个班次的良率，缺陷已去重`,
    data: { records: db.yieldRecords.length, totalShiftCount: shiftMap.size }
  };
}

export interface ManagerViewData {
  recurringDefects: Array<{
    type: string;
    count: number;
    totalQuantity: number;
    reworkCount: number;
    productCodes: string[];
  }>;
  shiftPenalties: Array<{
    machineId: string;
    shift: string;
    shiftDate: string;
    deductedDefects: number;
    passRate: number;
  }>;
  missingPhotos: Array<{
    defectId: string;
    defectType: string;
    batchId: string;
    hasVerdict: boolean;
  }>;
}

export function getManagerView(): CommandResult<ManagerViewData> {
  const db = loadDatabase();
  const allDefects = getAllDefects(db);

  const defectTypeMap = new Map<string, {
    count: number;
    totalQuantity: number;
    reworkCount: number;
    productCodes: Set<string>;
  }>();

  allDefects.forEach(d => {
    if (!defectTypeMap.has(d.defectType)) {
      defectTypeMap.set(d.defectType, {
        count: 0,
        totalQuantity: 0,
        reworkCount: 0,
        productCodes: new Set()
      });
    }
    const data = defectTypeMap.get(d.defectType)!;
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

  const missingPhotos: ManagerViewData['missingPhotos'] = [];
  
  allDefects.forEach(d => {
    if (d.photos.length === 0) {
      for (const inspection of db.inspections) {
        if (inspection.defects.some(x => x.id === d.id)) {
          const verdict = getCurrentVerdict(db, d.id);
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
          const verdict = getCurrentVerdict(db, d.id);
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

export function listDefects(defectType?: string): CommandResult<Defect[]> {
  const db = loadDatabase();
  let defects = getAllDefects(db);
  
  if (defectType) {
    defects = defects.filter(d => d.defectType === defectType);
  }

  return {
    success: true,
    message: `找到 ${defects.length} 条缺陷记录`,
    data: defects
  };
}

export function showVerdictHistory(defectId: string): CommandResult<VerdictHistory[]> {
  const db = loadDatabase();
  
  const defect = findDefectById(db, defectId);
  const fullDefectId = defect ? defect.id : defectId;
  
  const history = db.verdictHistory.filter(v => v.defectId === fullDefectId);
  
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

export interface ExportVerdict {
  defectId: string;
  defectType: string;
  defectDescription: string;
  batchId: string;
  productCode: string;
  machineId: string;
  shift: string;
  shiftDate: string;
  verdict: string;
  reason: string;
  judgedBy: string;
  judgedAt: string;
  photoSources: string[];
  isCurrent: boolean;
}

export function exportVerdicts(outputPath: string): CommandResult<{count: number, path: string}> {
  const db = loadDatabase();
  
  if (db.verdictHistory.length === 0) {
    return {
      success: false,
      message: '暂无复判记录可导出'
    };
  }

  const exported: ExportVerdict[] = [];

  db.verdictHistory.forEach(verdict => {
    const defect = findDefectById(db, verdict.defectId);
    if (!defect) return;

    let batchId = '';
    let productCode = '';
    let machineId = '';
    let shift = '';
    let shiftDate = '';

    for (const inspection of db.inspections) {
      if (inspection.defects.some(d => d.id === verdict.defectId)) {
        batchId = inspection.batchId;
        productCode = inspection.productCode;
        machineId = inspection.machineShift.machineId;
        shift = inspection.machineShift.shift;
        shiftDate = inspection.machineShift.shiftDate;
        break;
      }
    }

    if (!batchId) {
      for (const rework of db.reworkOrders) {
        if (rework.newDefects.some(d => d.id === verdict.defectId)) {
          batchId = rework.reworkBatchId;
          productCode = rework.productCode;
          machineId = rework.machineShift.machineId;
          shift = rework.machineShift.shift;
          shiftDate = rework.machineShift.shiftDate;
          break;
        }
      }
    }

    exported.push({
      defectId: verdict.defectId,
      defectType: defect.defectType,
      defectDescription: defect.description,
      batchId,
      productCode,
      machineId,
      shift,
      shiftDate,
      verdict: verdict.verdict,
      reason: verdict.reason,
      judgedBy: verdict.judgedBy,
      judgedAt: verdict.judgedAt,
      photoSources: verdict.photoSources,
      isCurrent: verdict.isCurrent
    });
  });

  exported.sort((a, b) => {
    if (a.defectId !== b.defectId) return a.defectId.localeCompare(b.defectId);
    return new Date(a.judgedAt).getTime() - new Date(b.judgedAt).getTime();
  });

  const output = {
    exportedAt: new Date().toISOString(),
    totalRecords: exported.length,
    records: exported
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  return {
    success: true,
    message: `已导出 ${exported.length} 条复判记录到 ${outputPath}`,
    data: { count: exported.length, path: outputPath }
  };
}
