import { create } from 'zustand';
import type { QualitySample, SourceType, WorkflowStatus } from '@/types';

export type DecisionType = 'approved' | 'rejected' | 'pending';

export interface CitationDecision {
  decisionType: DecisionType;
  reason: string;
  nextStep: string;
  remark: string;
  operatorName: string;
  decidedAt: string;
}

export interface Filters {
  batchId: string;
  defectType: string;
  sourceType: string;
  citationStatus: string;
  workflowStatus: string;
  keyword: string;
}

export type ExportFormat = 'excel' | 'csv' | 'pdf';
export type VersionOption = 'v1' | 'v2' | 'both';
export type ExportField = 'sampleInfo' | 'corrections' | 'citations' | 'operatorInfo' | 'versionInfo';

export interface ExportConfig {
  selectedBatches: string[];
  versionOption: VersionOption;
  selectedWorkflowStatuses: WorkflowStatus[];
  selectedSourceTypes: SourceType[];
  exportFormats: ExportFormat[];
  exportFields: ExportField[];
  includeKPI: boolean;
  includeBatchStats: boolean;
  includeConsistencyNote: boolean;
  fileName: string;
}

export interface ConsistencyCheckResult {
  path: string;
  consistent: boolean;
  pageValue: unknown;
  exportValue: unknown;
}

export interface ExportRecord {
  id: string;
  fileName: string;
  exportedAt: string;
  exportedBy: string;
  status: 'verified' | 'pending';
  sampleCount: number;
  formats: ExportFormat[];
}

export interface MaterialTask {
  id: string;
  sampleId: string;
  riskLevel: 'high' | 'medium' | 'low';
  defectType: string;
  missingTypes: Array<'standard_doc' | 'reference_image' | 'spec_sheet'>;
  missingDescription: string;
  missingReason: string;
  suggestedAction: string;
  dueDate: string;
  priority: number;
  checkedBy: string;
  imageUrl: string;
}

export interface ReleaseItem {
  id: string;
  sampleId: string;
  imageUrl: string;
  defectType: string;
  revisedJudgment: string;
  releaseBasis: string;
  originalReviewer: string;
  suggestedReleaseTime: string;
}

type OperatorTab = 'material' | 'release';

interface OperatorState {
  currentVersion: string;
  selectedSampleIds: string[];
  filters: Filters;
  citationDecisions: Map<string, CitationDecision>;

  activeTab: OperatorTab;
  selectedMaterialTaskIds: string[];
  selectedReleaseIds: string[];

  exportConfig: ExportConfig;
  exportRecords: ExportRecord[];
  lastConsistencyCheck: ConsistencyCheckResult[] | null;

  materialTasks: MaterialTask[];
  releaseItems: ReleaseItem[];
  showQuickGenerateDialog: boolean;

  setCurrentVersion: (version: string) => void;
  toggleSampleId: (sampleId: string) => void;
  clearSelectedIds: () => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  makeCitationDecision: (sampleId: string, decision: CitationDecision) => void;
  approveSample: (sampleId: string) => void;
  rejectSample: (sampleId: string, reason: string) => void;
  bulkApprove: (ids: string[]) => void;
  bulkReject: (ids: string[], reason: string) => void;

  setActiveTab: (tab: OperatorTab) => void;
  toggleMaterialTask: (id: string) => void;
  toggleReleaseItem: (id: string) => void;
  clearSelectedMaterial: () => void;
  clearSelectedRelease: () => void;
  approveMaterialTask: (id: string) => void;
  urgeMaterialTask: (id: string) => void;
  deferMaterialTask: (id: string) => void;
  reorderMaterialTasks: (sourceIdx: number, targetIdx: number) => void;
  pinMaterialTask: (id: string) => void;
  approveReleaseItem: (id: string) => void;
  rejectReleaseItem: (id: string) => void;
  approveAllReleases: () => void;
  setShowQuickGenerateDialog: (show: boolean) => void;

  setExportConfig: (config: Partial<ExportConfig>) => void;
  addExportRecord: (record: ExportRecord) => void;
  setConsistencyCheck: (results: ConsistencyCheckResult[] | null) => void;
  runConsistencyCheck: (samples: QualitySample[], exportSnapshot: Record<string, unknown>) => void;
}

const DEFAULT_FILTERS: Filters = {
  batchId: '',
  defectType: '',
  sourceType: '',
  citationStatus: '',
  workflowStatus: '',
  keyword: '',
};

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  selectedBatches: ['B001', 'B002'],
  versionOption: 'both',
  selectedWorkflowStatuses: ['approved', 'pending', 'need_material', 'recheck'],
  selectedSourceTypes: ['old_correction', 'normal_record', 'verbal_note'],
  exportFormats: ['excel'],
  exportFields: ['sampleInfo'],
  includeKPI: true,
  includeBatchStats: true,
  includeConsistencyNote: true,
  fileName: `质检报告_${new Date().toISOString().slice(0, 10)}`,
};

function generateMaterialTasks(): MaterialTask[] {
  const dueDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
  };
  const missingDescs = [
    '缺参考图像1张 + 规格书',
    '缺标准文档 2 份',
    '缺规格书 + 参考图像 2 张',
    '缺标准文档 1 份',
    '缺参考图像 3 张',
  ];
  const missingReasons = [
    '系统标注时未上传',
    '工艺工程师漏填',
    '文档版本更新需重新关联',
    '历史遗留数据缺失',
    '标注员操作失误',
  ];
  const actions = [
    '联系工艺工程师获取最新规格表，上传标准图集库中的对应图片',
    '从文档管理系统下载 GB/T 2828.1-2012 和企业质量规范 V3.2',
    '让前工序同事补拍参考图像，并同步产品 BOM 规格表',
    '联系文档管理员获取最新版标准文档',
    '请求品质部提供标准缺陷参照图',
  ];
  const riskColors: Array<'high' | 'medium' | 'low'> = ['high', 'high', 'medium', 'medium', 'low', 'low'];
  const types = ['表面划痕', '边缘缺损', '颜色偏差', '尺寸超差', '气泡空洞', '异物污染', '裂纹破损'];
  const names = ['张伟', '李娜', '王强', '赵敏'];
  const tasks: MaterialTask[] = [];
  for (let i = 0; i < 18; i++) {
    const risk = riskColors[i % riskColors.length];
    tasks.push({
      id: `TASK-${String(i + 1).padStart(4, '0')}`,
      sampleId: `S${String(i + 1).padStart(5, '0')}`,
      riskLevel: risk,
      defectType: types[i % types.length],
      missingTypes: i % 3 === 0
        ? ['reference_image', 'spec_sheet']
        : i % 3 === 1
        ? ['standard_doc']
        : ['standard_doc', 'reference_image', 'spec_sheet'],
      missingDescription: missingDescs[i % missingDescs.length],
      missingReason: missingReasons[i % missingReasons.length],
      suggestedAction: actions[i % actions.length],
      dueDate: dueDate(risk === 'high' ? 1 + (i % 2) : risk === 'medium' ? 3 + (i % 3) : 7 + (i % 4)),
      priority: i + 1,
      checkedBy: names[i % names.length],
      imageUrl: `https://picsum.photos/seed/task-${i}/160/120`,
    });
  }
  return tasks;
}

function generateReleaseItems(): ReleaseItem[] {
  const releaseBases = [
    '引用完整、阈值符合 V2、改判符合来源影响',
    '标准文档齐全，参考图像匹配，符合 V1 放行标准',
    '引用链完整，人工改判合理，建议立即放行',
    '双版本阈值均满足，引用材料齐全无问题',
  ];
  const reviewers = ['陈磊', '刘洋', '孙芳', '周杰'];
  const types = ['表面划痕', '边缘缺损', '颜色偏差', '尺寸超差', '气泡空洞', '异物污染'];
  const items: ReleaseItem[] = [];
  for (let i = 0; i < 24; i++) {
    items.push({
      id: `REL-${String(i + 1).padStart(4, '0')}`,
      sampleId: `S${String(100 + i).padStart(5, '0')}`,
      imageUrl: `https://picsum.photos/seed/rel-${i}/120/90`,
      defectType: types[i % types.length],
      revisedJudgment: i % 5 === 0 ? '合格' : i % 5 === 1 ? '特采' : '让步接收',
      releaseBasis: releaseBases[i % releaseBases.length],
      originalReviewer: reviewers[i % reviewers.length],
      suggestedReleaseTime: `建议 ${i % 2 === 0 ? '今日 17:00 前' : '明日 10:00 前'} 放行`,
    });
  }
  return items;
}

function generateExportRecords(): ExportRecord[] {
  const names = ['周姐', '陈磊', '刘洋', '孙芳'];
  const records: ExportRecord[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getTime() - i * 86400000 * (1 + Math.floor(i / 3)));
    records.push({
      id: `EXP-${String(i + 1).padStart(4, '0')}`,
      fileName: `质检报告_${d.toISOString().slice(0, 10)}.xlsx`,
      exportedAt: d.toISOString(),
      exportedBy: names[i % names.length],
      status: i % 3 === 0 ? 'pending' : 'verified',
      sampleCount: 40 + (i * 7) % 80,
      formats: i % 2 === 0 ? ['excel'] : ['excel', 'pdf'],
    });
  }
  return records;
}

export const useOperatorStore = create<OperatorState>((set, get) => ({
  currentVersion: '',
  selectedSampleIds: [],
  filters: { ...DEFAULT_FILTERS },
  citationDecisions: new Map(),

  activeTab: 'material',
  selectedMaterialTaskIds: [],
  selectedReleaseIds: [],

  exportConfig: { ...DEFAULT_EXPORT_CONFIG },
  exportRecords: generateExportRecords(),
  lastConsistencyCheck: null,

  materialTasks: generateMaterialTasks(),
  releaseItems: generateReleaseItems(),
  showQuickGenerateDialog: false,

  setCurrentVersion: (version) => set({ currentVersion: version }),

  toggleSampleId: (sampleId) =>
    set((state) => {
      const exists = state.selectedSampleIds.includes(sampleId);
      return {
        selectedSampleIds: exists
          ? state.selectedSampleIds.filter((id) => id !== sampleId)
          : [...state.selectedSampleIds, sampleId],
      };
    }),

  clearSelectedIds: () => set({ selectedSampleIds: [] }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  makeCitationDecision: (sampleId, decision) =>
    set((state) => {
      const newMap = new Map(state.citationDecisions);
      newMap.set(sampleId, decision);
      return { citationDecisions: newMap };
    }),

  approveSample: (sampleId) => {
    const decision: CitationDecision = {
      decisionType: 'approved',
      reason: '审核通过',
      nextStep: '',
      remark: '',
      operatorName: 'currentOperator',
      decidedAt: new Date().toISOString(),
    };
    get().makeCitationDecision(sampleId, decision);
  },

  rejectSample: (sampleId, reason) => {
    const decision: CitationDecision = {
      decisionType: 'rejected',
      reason,
      nextStep: '重新标注',
      remark: '',
      operatorName: 'currentOperator',
      decidedAt: new Date().toISOString(),
    };
    get().makeCitationDecision(sampleId, decision);
  },

  bulkApprove: (ids) => {
    const { makeCitationDecision } = get();
    ids.forEach((sampleId) => {
      const decision: CitationDecision = {
        decisionType: 'approved',
        reason: '批量审核通过',
        nextStep: '',
        remark: '',
        operatorName: 'currentOperator',
        decidedAt: new Date().toISOString(),
      };
      makeCitationDecision(sampleId, decision);
    });
  },

  bulkReject: (ids, reason) => {
    const { makeCitationDecision } = get();
    ids.forEach((sampleId) => {
      const decision: CitationDecision = {
        decisionType: 'rejected',
        reason,
        nextStep: '重新标注',
        remark: '',
        operatorName: 'currentOperator',
        decidedAt: new Date().toISOString(),
      };
      makeCitationDecision(sampleId, decision);
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleMaterialTask: (id) =>
    set((state) => {
      const exists = state.selectedMaterialTaskIds.includes(id);
      return {
        selectedMaterialTaskIds: exists
          ? state.selectedMaterialTaskIds.filter((x) => x !== id)
          : [...state.selectedMaterialTaskIds, id],
      };
    }),

  toggleReleaseItem: (id) =>
    set((state) => {
      const exists = state.selectedReleaseIds.includes(id);
      return {
        selectedReleaseIds: exists
          ? state.selectedReleaseIds.filter((x) => x !== id)
          : [...state.selectedReleaseIds, id],
      };
    }),

  clearSelectedMaterial: () => set({ selectedMaterialTaskIds: [] }),
  clearSelectedRelease: () => set({ selectedReleaseIds: [] }),

  approveMaterialTask: (id) =>
    set((state) => ({
      materialTasks: state.materialTasks.filter((t) => t.id !== id),
      selectedMaterialTaskIds: state.selectedMaterialTaskIds.filter((x) => x !== id),
    })),

  urgeMaterialTask: (_id) => {
    // simulate urge action - in real app would send notification
  },

  deferMaterialTask: (id) =>
    set((state) => ({
      materialTasks: state.materialTasks.map((t) => {
        if (t.id !== id) return t;
        const d = new Date(t.dueDate);
        d.setDate(d.getDate() + 3);
        return { ...t, dueDate: d.toISOString().slice(0, 10) };
      }),
    })),

  reorderMaterialTasks: (sourceIdx, targetIdx) =>
    set((state) => {
      const arr = [...state.materialTasks];
      const [moved] = arr.splice(sourceIdx, 1);
      arr.splice(targetIdx, 0, moved);
      return { materialTasks: arr.map((t, i) => ({ ...t, priority: i + 1 })) };
    }),

  pinMaterialTask: (id) =>
    set((state) => {
      const idx = state.materialTasks.findIndex((t) => t.id === id);
      if (idx <= 0) return {};
      const arr = [...state.materialTasks];
      const [moved] = arr.splice(idx, 1);
      arr.unshift(moved);
      return { materialTasks: arr.map((t, i) => ({ ...t, priority: i + 1 })) };
    }),

  approveReleaseItem: (id) =>
    set((state) => ({
      releaseItems: state.releaseItems.filter((r) => r.id !== id),
      selectedReleaseIds: state.selectedReleaseIds.filter((x) => x !== id),
    })),

  rejectReleaseItem: (id) =>
    set((state) => ({
      releaseItems: state.releaseItems.filter((r) => r.id !== id),
      selectedReleaseIds: state.selectedReleaseIds.filter((x) => x !== id),
    })),

  approveAllReleases: () => set({ releaseItems: [] }),

  setShowQuickGenerateDialog: (show) => set({ showQuickGenerateDialog: show }),

  setExportConfig: (config) =>
    set((state) => ({
      exportConfig: { ...state.exportConfig, ...config },
    })),

  addExportRecord: (record) =>
    set((state) => ({
      exportRecords: [record, ...state.exportRecords],
    })),

  setConsistencyCheck: (results) => set({ lastConsistencyCheck: results }),

  runConsistencyCheck: (_samples, _exportSnapshot) => {
    const mockResults: ConsistencyCheckResult[] = [
      { path: 'root.batchFilter', consistent: true, pageValue: ['B001', 'B002'], exportValue: ['B001', 'B002'] },
      { path: 'root.versionOption', consistent: true, pageValue: 'both', exportValue: 'both' },
      { path: 'root.workflowStatuses', consistent: true, pageValue: 4, exportValue: 4 },
      { path: 'root.sourceTypes', consistent: true, pageValue: 3, exportValue: 3 },
      { path: 'root.samples[0].sampleId', consistent: true, pageValue: 'S00001', exportValue: 'S00001' },
      { path: 'root.samples[0].revisedJudgment', consistent: true, pageValue: '合格', exportValue: '合格' },
      { path: 'root.samples[1].sampleId', consistent: true, pageValue: 'S00002', exportValue: 'S00002' },
      {
        path: 'root.samples[1].citations.length',
        consistent: false,
        pageValue: 3,
        exportValue: 2,
      },
      {
        path: 'root.samples[5].workflowStatus',
        consistent: false,
        pageValue: 'approved',
        exportValue: 'pending',
      },
      { path: 'root.samples[6].sampleId', consistent: true, pageValue: 'S00007', exportValue: 'S00007' },
    ];
    set({ lastConsistencyCheck: mockResults });
  },
}));
