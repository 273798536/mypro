import { create } from 'zustand';
import type { Sample, CalculationParams, QcStep, ImageAnnotation, SampleChangeLog } from '@/types';
import { mockSamples } from '@/data/mockSamples';
import { DEFAULT_PARAMS } from '@/utils/calculator';

interface ReportState {
  samples: Sample[];
  selectedSampleId: string | null;
  params: CalculationParams;
  qcSteps: QcStep[];
  imageAnnotations: ImageAnnotation[];
  changeLogs: SampleChangeLog[];
  setSelectedSample: (id: string | null) => void;
  updateSample: (id: string, updates: Partial<Sample>) => void;
  updateParams: (params: Partial<CalculationParams>) => void;
  updateQcStep: (stepId: string, updates: Partial<QcStep>) => void;
  resetQcSteps: () => void;
  addChangeLog: (log: SampleChangeLog) => void;
}

const initialQcSteps: QcStep[] = [
  {
    id: 'qc-1',
    name: '重复运行',
    status: 'pending',
    description: '对所有样本重复执行计算 3 次，验证结果一致性',
  },
  {
    id: 'qc-2',
    name: '补录数据',
    status: 'pending',
    description: '检查样本完整性，补充缺失字段，测试补录流程',
  },
  {
    id: 'qc-3',
    name: '人工确认',
    status: 'pending',
    description: '对计算结果和图像标注进行人工逐项确认',
  },
];

const initialAnnotations: ImageAnnotation[] = [
  {
    sampleBarcode: 'TM-2025-00127',
    beforeAnnotation: '镜下观察：轻度核异型，倾向良性',
    afterAnnotation: '镜下观察：中度核异型，核分裂象可见，倾向恶性',
    diffDescription: '原标注漏诊了高倍视野中的核分裂象，重新评估后升级为恶性倾向',
    timestamp: '2025-06-08 14:32',
    operator: '李老师',
    beforeMutationCall: '阴性（仅形态学）',
    afterMutationCall: '阳性（形态学 + 测序）',
  },
  {
    sampleBarcode: 'TM-2025-00130',
    beforeAnnotation: '腺癌，中分化，突变状态待定',
    afterAnnotation: '腺癌，中分化，伴 EGFR 19 外显子缺失突变',
    diffDescription: '补充了测序结果与形态学的对应标注，明确了突变亚型',
    timestamp: '2025-06-09 09:15',
    operator: '王老师',
    beforeMutationCall: '不确定',
    afterMutationCall: '阳性（EGFR 19del）',
  },
];

const initialChangeLogs: SampleChangeLog[] = [
  {
    id: 'log-1',
    sampleBarcode: 'TM-2025-00128',
    fieldName: 'totalReads',
    oldValue: '892',
    newValue: '5680',
    oldMutationFrequency: 3.14,
    newMutationFrequency: 4.74,
    oldConclusion: '不确定',
    newConclusion: '阴性',
    timestamp: '2025-06-07 16:20',
    operator: '张老师',
  },
  {
    id: 'log-2',
    sampleBarcode: 'TM-2025-00129',
    fieldName: 'mutantReads',
    oldValue: '156',
    newValue: '1832',
    oldMutationFrequency: 0.61,
    newMutationFrequency: 7.15,
    oldConclusion: '阴性',
    newConclusion: '阳性',
    timestamp: '2025-06-09 11:05',
    operator: '李老师',
  },
  {
    id: 'log-3',
    sampleBarcode: 'TM-2025-00131',
    fieldName: 'qualityScore',
    oldValue: '18.2',
    newValue: '33.6',
    oldMutationFrequency: 0.28,
    newMutationFrequency: 0.28,
    oldConclusion: '不确定',
    newConclusion: '阴性',
    timestamp: '2025-06-08 10:40',
    operator: '王老师',
  },
];

export const useReportStore = create<ReportState>((set) => ({
  samples: mockSamples,
  selectedSampleId: mockSamples[0]?.id ?? null,
  params: DEFAULT_PARAMS,
  qcSteps: initialQcSteps,
  imageAnnotations: initialAnnotations,
  changeLogs: initialChangeLogs,

  setSelectedSample: (id) => set({ selectedSampleId: id }),

  updateSample: (id, updates) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  updateParams: (params) =>
    set((state) => ({
      params: { ...state.params, ...params },
    })),

  updateQcStep: (stepId, updates) =>
    set((state) => ({
      qcSteps: state.qcSteps.map((s) =>
        s.id === stepId ? { ...s, ...updates } : s
      ),
    })),

  resetQcSteps: () => set({ qcSteps: initialQcSteps.map(s => ({ ...s, status: 'pending', resultDetail: undefined })) }),

  addChangeLog: (log) =>
    set((state) => ({
      changeLogs: [log, ...state.changeLogs],
    })),
}));
