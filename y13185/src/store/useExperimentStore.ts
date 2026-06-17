import { create } from 'zustand';
import { produce } from 'immer';
import {
  ExperimentRecord,
  FieldMapping,
  ParsedFileData,
  CalculationParameters,
  CalculationResult,
  OperationLog,
  SuspendRecord,
  Annotation,
} from '@/types/experiment';
import {
  loadExperiments,
  loadResults,
  loadOperationLogs,
  loadSuspendRecords,
  saveExperiments,
  saveResults,
  saveOperationLogs,
  saveSuspendRecords,
  generateId,
  getCurrentUser,
} from '@/utils/storage';
import { findBestFieldMatch } from '@/constants/fieldMapping';
import { checkDirectionSigns } from '@/utils/directionCheck';
import { performCalculation, getFormulaForResult, performBoundaryAnalysis } from '@/utils/calculationEngine';
import { DEFAULT_PARAMETERS } from '@/constants/parameters';

interface ExperimentState {
  experiments: ExperimentRecord[];
  results: CalculationResult[];
  operationLogs: OperationLog[];
  suspendRecords: SuspendRecord[];
  selectedRecordId: string | null;
  selectedResultId: string | null;
  isLoading: boolean;
  error: string | null;
  
  init: () => void;
  importParsedData: (parsedData: ParsedFileData, customMappings?: FieldMapping[]) => ExperimentRecord[];
  updateFieldMapping: (recordId: string, mappingId: string, targetField: string) => void;
  selectRecord: (recordId: string | null) => void;
  selectResult: (resultId: string | null) => void;
  
  performCalculationForRecord: (recordId: string, parameters: CalculationParameters) => CalculationResult | null;
  updateAnnotation: (resultId: string, field: keyof Annotation, value: string, syncAll?: boolean) => void;
  
  createSuspendRecord: (resultId: string, reason: SuspendRecord['reason'], description: string, originalValue: any) => void;
  processSuspendRecord: (suspendId: string, action: 'approve' | 'reject' | 'correct', remark: string, correctedValue?: any) => void;
  
  addOperationLog: (resultId: string, operationType: OperationLog['operationType'], beforeSnapshot: any, afterSnapshot: any, remark: string) => void;
  
  getSelectedRecord: () => ExperimentRecord | undefined;
  getSelectedResult: () => CalculationResult | undefined;
  getResultsForRecord: (recordId: string) => CalculationResult[];
  getSuspendRecordsForResult: (resultId: string) => SuspendRecord[];
  getLogsForResult: (resultId: string) => OperationLog[];
  getPendingSuspends: () => SuspendRecord[];
  
  clearError: () => void;
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  experiments: [],
  results: [],
  operationLogs: [],
  suspendRecords: [],
  selectedRecordId: null,
  selectedResultId: null,
  isLoading: false,
  error: null,
  
  init: () => {
    set({
      experiments: loadExperiments(),
      results: loadResults(),
      operationLogs: loadOperationLogs(),
      suspendRecords: loadSuspendRecords(),
    });
  },
  
  importParsedData: (parsedData: ParsedFileData, customMappings?: FieldMapping[]) => {
    const currentUser = getCurrentUser();
    const newRecords: ExperimentRecord[] = [];
    
    const records = parsedData.rows.map(row => {
      const mappings: FieldMapping[] = customMappings || parsedData.headers.map(header => {
        const { targetField, confidence } = findBestFieldMatch(header);
        return {
          id: generateId(),
          sourceFieldName: header,
          targetFieldName: targetField,
          fieldSource: customMappings ? 'manual-mapped' : confidence > 0.8 ? 'auto-detected' : 'auto-detected',
          processStatus: targetField ? 'processed' : 'pending',
          matchConfidence: confidence,
        };
      });
      
      const mappedData: Record<string, any> = {};
      mappings.forEach(m => {
        if (m.targetFieldName) {
          mappedData[m.targetFieldName] = row[m.sourceFieldName];
        }
      });
      
      const directionCheck = checkDirectionSigns(
        row,
        mappings.filter(m => m.targetFieldName).map(m => ({
          sourceField: m.sourceFieldName,
          targetField: m.targetFieldName,
        }))
      );
      
      const now = Date.now();
      const record: ExperimentRecord = {
        id: generateId(),
        sourceFileName: parsedData.fileName,
        experimentName: mappedData.experimentName || parsedData.fileName,
        rawData: { ...row },
        mappedData,
        importTimestamp: now,
        importedAt: now,
        importedBy: currentUser,
        maintenanceRemark: mappedData.maintenanceRemark,
        fieldMappings: mappings,
        directionSignCheck: directionCheck,
      };
      
      newRecords.push(record);
      return record;
    });
    
    set(state => {
      const updated = [...state.experiments, ...newRecords];
      saveExperiments(updated);
      return { experiments: updated };
    });
    
    newRecords.forEach(record => {
      get().addOperationLog(
        record.id,
        'import',
        null,
        record,
        `从文件 ${parsedData.fileName} 导入数据`
      );
    });
    
    return records;
  },
  
  updateFieldMapping: (recordId: string, mappingId: string, targetField: string) => {
    set(state => {
      const updated = produce(state.experiments, drafts => {
        const record = drafts.find(r => r.id === recordId);
        if (record) {
          const mapping = record.fieldMappings.find(m => m.id === mappingId);
          if (mapping) {
            mapping.targetFieldName = targetField;
            mapping.fieldSource = 'manual-mapped';
            mapping.processStatus = targetField ? 'processed' : 'pending';
          }
          
          if (targetField && record.rawData[mapping?.sourceFieldName || ''] !== undefined) {
            record.mappedData[targetField] = record.rawData[mapping?.sourceFieldName || ''];
          }
          
          record.directionSignCheck = checkDirectionSigns(
            record.rawData,
            record.fieldMappings.filter(m => m.targetFieldName).map(m => ({
              sourceField: m.sourceFieldName,
              targetField: m.targetFieldName,
            }))
          );
        }
      });
      saveExperiments(updated);
      return { experiments: updated };
    });
  },
  
  selectRecord: (recordId) => set({ selectedRecordId: recordId, selectedResultId: null }),
  selectResult: (resultId) => set({ selectedResultId: resultId }),
  
  performCalculationForRecord: (recordId: string, parameters: CalculationParameters) => {
    const state = get();
    const record = state.experiments.find(r => r.id === recordId);
    if (!record) {
      set({ error: '未找到对应的实验记录' });
      return null;
    }

    const hasDirectionAnomaly = record.directionSignCheck.hasAnomaly;
    const recordResultIds = new Set(state.results.filter(r => r.recordId === recordId).map(r => r.id));
    const hasConfirmed = hasDirectionAnomaly && state.suspendRecords.some(s =>
      recordResultIds.has(s.resultId) && s.status !== 'pending'
    );
    const shouldSuspend = hasDirectionAnomaly && !hasConfirmed;

    const currentUser = getCurrentUser();
    const existingVersions = state.results.filter(r => r.recordId === recordId).length;

    const calcResult = performCalculation(parameters);
    const formula = getFormulaForResult('liftCoefficient', parameters, calcResult.liftCoefficient);
    const boundaryAnalysis = performBoundaryAnalysis(parameters, calcResult);

    const annotations: Annotation = {
      sceneNote: '',
      sideNote: '',
      screenshotNote: '',
      lastSyncedAt: 0,
      syncMode: 'synchronized',
    };

    const now = Date.now();
    const parameterGear = parameters.parameterLevel === 'level1' ? 1 : parameters.parameterLevel === 'level2' ? 2 : parameters.parameterLevel === 'level3' ? 3 : 'custom';
    const result: CalculationResult = {
      id: generateId(),
      recordId,
      experimentRecordId: recordId,
      version: existingVersions + 1,
      parameters,
      result: calcResult,
      formula,
      boundaryAnalysis,
      status: shouldSuspend ? 'suspended' : 'normal',
      annotations,
      parameterGear,
      calculatedAt: now,
      createdAt: now,
      createdBy: currentUser,
      updatedAt: now,
      liftCoefficient: calcResult.liftCoefficient,
      dragCoefficient: calcResult.dragCoefficient,
      reynoldsNumber: calcResult.reynoldsNumber,
    };

    set(state => {
      const updated = [...state.results, result];
      saveResults(updated);
      return { results: updated, selectedResultId: result.id };
    });

    get().addOperationLog(
      result.id,
      'calculate',
      null,
      result,
      shouldSuspend
        ? `复算因方向符号异常已挂起，等待项目经理确认（异常字段: ${record.directionSignCheck.anomalousFields.join(', ')}）`
        : `使用${parameters.parameterLevel === 'custom' ? '自定义' : ''}参数完成复算`
    );

    if (shouldSuspend) {
      get().createSuspendRecord(
        result.id,
        'direction_sign_reversed',
        `方向符号异常字段: ${record.directionSignCheck.anomalousFields.join(', ')}（预期${record.directionSignCheck.expectedDirection === 'positive' ? '正值' : '负值'}）`,
        record.directionSignCheck.detectedValues
      );
      set({ error: '存在方向符号异常，已自动挂起等待项目经理确认，请前往「异常处理」页面处理' });
      return null;
    }

    return result;
  },
  
  updateAnnotation: (resultId: string, field: keyof Annotation, value: string, syncAll = true) => {
    const state = get();
    const result = state.results.find(r => r.id === resultId);
    if (!result) return;
    
    const beforeSnapshot = { ...result.annotations };
    
    set(state => {
      const updated = produce(state.results, drafts => {
        const r = drafts.find(d => d.id === resultId);
        if (r) {
          if (syncAll && r.annotations.syncMode === 'synchronized') {
            r.annotations.sceneNote = value;
            r.annotations.sideNote = value;
            r.annotations.screenshotNote = value;
          } else {
            (r.annotations as any)[field] = value;
          }
          r.annotations.lastSyncedAt = Date.now();
          r.updatedAt = Date.now();
        }
      });
      saveResults(updated);
      return { results: updated };
    });
    
    const afterSnapshot = { ...get().results.find(r => r.id === resultId)?.annotations };
    
    get().addOperationLog(
      resultId,
      'annotate',
      beforeSnapshot,
      afterSnapshot,
      syncAll ? '同步更新所有标注' : `更新${field === 'sceneNote' ? '场景标注' : field === 'sideNote' ? '侧边说明' : '截图说明'}`
    );
  },
  
  createSuspendRecord: (resultId: string, reason: SuspendRecord['reason'], description: string, originalValue: any) => {
    const currentUser = getCurrentUser();
    
    const suspendRecord: SuspendRecord = {
      id: generateId(),
      resultId,
      reason,
      description,
      originalValue,
      status: 'pending',
    };
    
    set(state => {
      const updatedSuspends = [...state.suspendRecords, suspendRecord];
      saveSuspendRecords(updatedSuspends);
      
      const updatedResults = produce(state.results, drafts => {
        const r = drafts.find(d => d.id === resultId);
        if (r) {
          r.status = 'suspended';
        }
      });
      saveResults(updatedResults);
      
      return {
        suspendRecords: updatedSuspends,
        results: updatedResults,
      };
    });
    
    get().addOperationLog(
      resultId,
      'suspend',
      null,
      suspendRecord,
      `因${reason === 'direction_sign_reversed' ? '方向符号异常' : reason === 'boundary_anomaly' ? '边界值异常' : '手动挂起'}挂起记录`
    );
  },
  
  processSuspendRecord: (suspendId: string, action: 'approve' | 'reject' | 'correct', remark: string, correctedValue?: any) => {
    const currentUser = getCurrentUser();
    const state = get();
    const suspend = state.suspendRecords.find(s => s.id === suspendId);
    if (!suspend) return;
    
    const beforeSnapshot = { ...suspend };
    
    set(state => {
      const updatedSuspends = produce(state.suspendRecords, drafts => {
        const s = drafts.find(d => d.id === suspendId);
        if (s) {
          s.status = action === 'approve' ? 'approved' : action === 'correct' ? 'corrected' : 'rejected';
          s.confirmUser = currentUser;
          s.confirmTime = Date.now();
          s.confirmRemark = remark;
          if (correctedValue !== undefined) {
            s.suggestedValue = correctedValue;
          }
        }
      });
      saveSuspendRecords(updatedSuspends);
      
      const updatedResults = produce(state.results, drafts => {
        const r = drafts.find(d => d.id === suspend.resultId);
        if (r && action !== 'reject') {
          r.status = action === 'correct' ? 'confirmed' : 'normal';
        } else if (r && action === 'reject') {
          r.status = 'rejected';
        }
      });
      saveResults(updatedResults);
      
      return {
        suspendRecords: updatedSuspends,
        results: updatedResults,
      };
    });
    
    const afterSnapshot = { ...get().suspendRecords.find(s => s.id === suspendId) };
    
    const actionText = action === 'approve' ? '批准放行' : action === 'correct' ? '修正后确认' : '拒绝';
    get().addOperationLog(
      suspend.resultId,
      action === 'reject' ? 'reject' : 'confirm',
      beforeSnapshot,
      afterSnapshot,
      `${actionText}挂起记录：${remark}`
    );
  },
  
  addOperationLog: (resultId: string, operationType, beforeSnapshot, afterSnapshot, remark) => {
    const currentUser = getCurrentUser();
    const log: OperationLog = {
      id: generateId(),
      resultId,
      operator: currentUser,
      operationType,
      beforeSnapshot,
      afterSnapshot,
      timestamp: Date.now(),
      remark,
    };
    
    set(state => {
      const updated = [...state.operationLogs, log];
      saveOperationLogs(updated);
      return { operationLogs: updated };
    });
  },
  
  getSelectedRecord: () => {
    const state = get();
    return state.experiments.find(r => r.id === state.selectedRecordId);
  },
  
  getSelectedResult: () => {
    const state = get();
    return state.results.find(r => r.id === state.selectedResultId);
  },
  
  getResultsForRecord: (recordId) => {
    return get().results.filter(r => r.recordId === recordId).sort((a, b) => b.createdAt - a.createdAt);
  },
  
  getSuspendRecordsForResult: (resultId) => {
    return get().suspendRecords.filter(s => s.resultId === resultId).sort((a, b) => (b.confirmTime || b.id.localeCompare(a.id)));
  },
  
  getLogsForResult: (resultId) => {
    return get().operationLogs.filter(l => l.resultId === resultId).sort((a, b) => b.timestamp - a.timestamp);
  },
  
  getPendingSuspends: () => {
    return get().suspendRecords.filter(s => s.status === 'pending');
  },
  
  clearError: () => set({ error: null }),
}));
