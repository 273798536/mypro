import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnalysisRecord, AuditLogEntry, TimeSeriesPoint } from '../types';
import { 
  calculateCorrelation, 
  detectMisjudgment, 
  createEvidenceItem, 
  generateId,
  recalculateWithLagOverride 
} from '../utils/analysisEngine';
import { createDemoRecords } from '../utils/demoData';

interface AnalysisState {
  records: AnalysisRecord[];
  auditLogs: AuditLogEntry[];
  selectedRecordId: string | null;
  isLoading: boolean;
  
  addRecord: (data: {
    metricA: string;
    metricB: string;
    timeSeriesData: TimeSeriesPoint[];
    sampleSize: number;
    dataSource: string;
    groupField?: string;
    eventNote?: string;
  }) => void;
  
  updateGroupField: (recordId: string, groupField: string) => void;
  updateEventNote: (recordId: string, eventNote: string) => void;
  modifyLagValue: (recordId: string, newLagValue: number, reason: string, operator: string) => void;
  setSelectedRecordId: (id: string | null) => void;
  deleteRecord: (recordId: string) => void;
  loadDemoData: () => void;
  clearAllData: () => void;
  batchAddRecords: (records: Array<{
    metricA: string;
    metricB: string;
    timeSeriesData: TimeSeriesPoint[];
    sampleSize: number;
    dataSource: string;
  }>) => void;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      records: [],
      auditLogs: [],
      selectedRecordId: null,
      isLoading: false,

      addRecord: (data) => {
        const now = new Date().toISOString();
        const corrResult = calculateCorrelation(data.timeSeriesData);
        const detectResult = detectMisjudgment(corrResult, data.sampleSize);
        
        const evidenceChain: AnalysisRecord['evidenceChain'] = [
          createEvidenceItem('source', `数据来源：${data.dataSource}，日期范围：${data.timeSeriesData[0]?.date || '未知'} 至 ${data.timeSeriesData[data.timeSeriesData.length - 1]?.date || '未知'}`),
          createEvidenceItem('judgment', `执行相关性计算：Pearson r=${corrResult.coefficient.toFixed(3)}, p=${corrResult.pValue.toFixed(4)}`),
          createEvidenceItem('judgment', `误判检测：样本量=${data.sampleSize}，缺失率=${(corrResult.missingRate * 100).toFixed(1)}%，异常值影响=${corrResult.outlierImpact.toFixed(3)}`),
          createEvidenceItem('result', detectResult.judgment),
        ];

        const newRecord: AnalysisRecord = {
          id: generateId(),
          metricA: data.metricA,
          metricB: data.metricB,
          timeSeriesData: data.timeSeriesData,
          sampleSize: data.sampleSize,
          status: detectResult.status,
          judgment: detectResult.judgment,
          correlationCoeff: corrResult.coefficient,
          pValue: corrResult.pValue,
          lagValue: corrResult.lagValue,
          lagModified: false,
          pendingReason: detectResult.pendingReason,
          abnormalReason: detectResult.abnormalReason,
          evidenceChain,
          createdAt: now,
          updatedAt: now,
          dataSource: data.dataSource,
          groupField: data.groupField,
          groupFieldAddedAt: data.groupField ? now : undefined,
          eventNote: data.eventNote,
          eventNoteAddedAt: data.eventNote ? now : undefined,
        };

        set((state) => ({
          records: [...state.records, newRecord],
        }));
      },

      updateGroupField: (recordId, groupField) => {
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((record) => {
            if (record.id !== recordId) return record;
            
            const newEvidence = createEvidenceItem(
              'source', 
              `补充分组字段：${groupField}`, 
              'user'
            );
            
            return {
              ...record,
              groupField,
              groupFieldAddedAt: now,
              updatedAt: now,
              evidenceChain: [...record.evidenceChain, newEvidence],
            };
          }),
        }));
      },

      updateEventNote: (recordId, eventNote) => {
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((record) => {
            if (record.id !== recordId) return record;
            
            const newEvidence = createEvidenceItem(
              'source', 
              `补充事件备注：${eventNote}`, 
              'user'
            );
            
            return {
              ...record,
              eventNote,
              eventNoteAddedAt: now,
              updatedAt: now,
              evidenceChain: [...record.evidenceChain, newEvidence],
            };
          }),
        }));
      },

      modifyLagValue: (recordId, newLagValue, reason, operator) => {
        const now = new Date().toISOString();
        const record = get().records.find(r => r.id === recordId);
        if (!record) return;

        const oldLagValue = record.lagValue;
        const originalJudgment = record.judgment;
        const originalLagJudgment = record.originalLagJudgment || record.judgment;
        
        const { correlationResult, detectionResult } = recalculateWithLagOverride(record, newLagValue);

        const auditLog: AuditLogEntry = {
          id: `AUDIT_${Date.now().toString(36).toUpperCase()}`,
          recordId,
          fieldName: 'lagValue',
          oldValue: oldLagValue.toString(),
          newValue: newLagValue.toString(),
          reason,
          modifiedAt: now,
          operator,
          impactScope: ['judgment', 'correlationCoeff', 'pValue', 'status'],
        };

        const newEvidence = createEvidenceItem(
          'judgment', 
          `人工修改滞后检查：${oldLagValue}天 → ${newLagValue}天，原因：${reason}`, 
          'user'
        );
        const resultEvidence = createEvidenceItem(
          'result', 
          `重新计算结果：${detectionResult.judgment}`, 
          'system'
        );

        set((state) => ({
          records: state.records.map((r) => {
            if (r.id !== recordId) return r;
            return {
              ...r,
              lagValue: newLagValue,
              lagModified: true,
              originalLagJudgment,
              correlationCoeff: correlationResult.coefficient,
              pValue: correlationResult.pValue,
              status: detectionResult.status,
              judgment: detectionResult.judgment,
              pendingReason: detectionResult.pendingReason,
              abnormalReason: detectionResult.abnormalReason,
              updatedAt: now,
              evidenceChain: [...r.evidenceChain, newEvidence, resultEvidence],
            };
          }),
          auditLogs: [...state.auditLogs, auditLog],
        }));
      },

      setSelectedRecordId: (id) => set({ selectedRecordId: id }),

      deleteRecord: (recordId) => {
        set((state) => ({
          records: state.records.filter((r) => r.id !== recordId),
          auditLogs: state.auditLogs.filter((l) => l.recordId !== recordId),
          selectedRecordId: state.selectedRecordId === recordId ? null : state.selectedRecordId,
        }));
      },

      loadDemoData: () => {
        const demoRecords = createDemoRecords();
        set({ 
          records: demoRecords,
          auditLogs: [],
          selectedRecordId: null,
        });
      },

      clearAllData: () => {
        set({
          records: [],
          auditLogs: [],
          selectedRecordId: null,
        });
      },

      batchAddRecords: (recordsData) => {
        const now = new Date().toISOString();
        const newRecords: AnalysisRecord[] = [];

        for (const data of recordsData) {
          const corrResult = calculateCorrelation(data.timeSeriesData);
          const detectResult = detectMisjudgment(corrResult, data.sampleSize);
          
          const evidenceChain: AnalysisRecord['evidenceChain'] = [
            createEvidenceItem('source', `数据来源：${data.dataSource}，日期范围：${data.timeSeriesData[0]?.date || '未知'} 至 ${data.timeSeriesData[data.timeSeriesData.length - 1]?.date || '未知'}`),
            createEvidenceItem('judgment', `执行相关性计算：Pearson r=${corrResult.coefficient.toFixed(3)}, p=${corrResult.pValue.toFixed(4)}`),
            createEvidenceItem('judgment', `误判检测：样本量=${data.sampleSize}，缺失率=${(corrResult.missingRate * 100).toFixed(1)}%，异常值影响=${corrResult.outlierImpact.toFixed(3)}`),
            createEvidenceItem('result', detectResult.judgment),
          ];

          newRecords.push({
            id: generateId(),
            metricA: data.metricA,
            metricB: data.metricB,
            timeSeriesData: data.timeSeriesData,
            sampleSize: data.sampleSize,
            status: detectResult.status,
            judgment: detectResult.judgment,
            correlationCoeff: corrResult.coefficient,
            pValue: corrResult.pValue,
            lagValue: corrResult.lagValue,
            lagModified: false,
            pendingReason: detectResult.pendingReason,
            abnormalReason: detectResult.abnormalReason,
            evidenceChain,
            createdAt: now,
            updatedAt: now,
            dataSource: data.dataSource,
          });
        }

        set((state) => ({
          records: [...state.records, ...newRecords],
        }));
      },
    }),
    {
      name: 'correlation-analysis-storage',
      partialize: (state) => ({
        records: state.records,
        auditLogs: state.auditLogs,
      }),
    }
  )
);
