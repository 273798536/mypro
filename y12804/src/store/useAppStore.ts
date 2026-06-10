import { create } from 'zustand';
import type {
  Cage,
  Sample,
  QcResult,
  ReagentBatch,
  Anomaly,
  RunBatch,
  AnomalyCategory,
  AnomalySeverity,
  DuplicateBarcodeInfo,
} from '@/types';
import { generateId, generateBatchNumber, formatDateTime } from '@/utils/common';
import { setStorageItem, getStorageItem } from '@/utils/storage';
import { formulas } from '@/data/formulas';
import { evaluateFormula } from '@/utils/formula';

interface AppState {
  cages: Cage[];
  samples: Sample[];
  qcResults: QcResult[];
  reagentBatches: ReagentBatch[];
  anomalies: Anomaly[];
  runBatches: RunBatch[];
  currentRunBatch: RunBatch | null;

  addCage: (cage: Omit<Cage, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCage: (id: string, data: Partial<Cage>) => void;
  deleteCage: (id: string) => void;

  addSample: (sample: Omit<Sample, 'id' | 'createdAt'>) => void;
  updateSample: (id: string, data: Partial<Sample>) => void;
  deleteSample: (id: string) => void;
  getDuplicateBarcodes: () => DuplicateBarcodeInfo[];

  addReagentBatch: (batch: Omit<ReagentBatch, 'id'>) => void;
  updateReagentBatch: (id: string, data: Partial<ReagentBatch>) => void;

  createRunBatch: (name: string, operator: string) => RunBatch;
  runQcAnalysis: (runBatchId: string, sampleIds: string[]) => void;
  updateReagentAndRecalculate: (qcResultId: string, reagentBatchId: string) => void;

  addAnomaly: (anomaly: Omit<Anomaly, 'id' | 'createdAt'>) => void;
  updateAnomalyStatus: (id: string, status: Anomaly['status']) => void;
  getAnomaliesByCategory: (category: AnomalyCategory) => Anomaly[];

  loadFromStorage: () => void;
  saveToStorage: () => void;
  initMockData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  cages: [],
  samples: [],
  qcResults: [],
  reagentBatches: [],
  anomalies: [],
  runBatches: [],
  currentRunBatch: null,

  addCage: (cageData) => {
    const now = new Date().toISOString();
    const newCage: Cage = {
      ...cageData,
      id: generateId('cage_'),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ cages: [...state.cages, newCage] }));
    get().saveToStorage();
  },

  updateCage: (id, data) => {
    set((state) => ({
      cages: state.cages.map((c) =>
        c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
      ),
    }));
    get().saveToStorage();
  },

  deleteCage: (id) => {
    set((state) => ({
      cages: state.cages.filter((c) => c.id !== id),
    }));
    get().saveToStorage();
  },

  addSample: (sampleData) => {
    const newSample: Sample = {
      ...sampleData,
      id: generateId('sample_'),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ samples: [...state.samples, newSample] }));

    const state = get();
    const duplicates = state.getDuplicateBarcodes();
    const barcodeDup = duplicates.find((d) => d.barcode === sampleData.barcode);
    if (barcodeDup && barcodeDup.count > 1) {
      const runBatchId = state.currentRunBatch?.id || 'manual';
      state.addAnomaly({
        sampleId: newSample.id,
        runBatchId,
        type: '样本条码重复',
        severity: 'high',
        category: 'supplement',
        description: `条码 "${sampleData.barcode}" 出现 ${barcodeDup.count} 次重复，可能导致检测结果混淆。`,
        suggestion: '请核实条码信息，修正重复条码后重新录入。如为同一样本复测，请在备注中注明。',
        status: 'pending',
        resolvedAt: null,
        affectedSamples: barcodeDup.samples.map((s) => s.id),
      });
    }

    get().saveToStorage();
  },

  updateSample: (id, data) => {
    set((state) => ({
      samples: state.samples.map((s) => (s.id === id ? { ...s, ...data } : s)),
    }));
    get().saveToStorage();
  },

  deleteSample: (id) => {
    set((state) => ({
      samples: state.samples.filter((s) => s.id !== id),
      qcResults: state.qcResults.filter((q) => q.sampleId !== id),
      anomalies: state.anomalies.map((a) => ({
        ...a,
        affectedSamples: a.affectedSamples.filter((sid) => sid !== id),
      })),
    }));
    get().saveToStorage();
  },

  getDuplicateBarcodes: () => {
    const { samples } = get();
    const barcodeMap = new Map<string, Sample[]>();

    for (const sample of samples) {
      if (!barcodeMap.has(sample.barcode)) {
        barcodeMap.set(sample.barcode, []);
      }
      barcodeMap.get(sample.barcode)!.push(sample);
    }

    const duplicates: DuplicateBarcodeInfo[] = [];
    for (const [barcode, sampleList] of barcodeMap) {
      if (sampleList.length > 1) {
        const sorted = [...sampleList].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        duplicates.push({
          barcode,
          count: sampleList.length,
          samples: sorted,
          firstCreatedAt: sorted[0].createdAt,
          lastCreatedAt: sorted[sorted.length - 1].createdAt,
        });
      }
    }

    return duplicates.sort((a, b) => b.count - a.count);
  },

  addReagentBatch: (batchData) => {
    const newBatch: ReagentBatch = {
      ...batchData,
      id: generateId('reagent_'),
    };
    set((state) => ({ reagentBatches: [...state.reagentBatches, newBatch] }));
    get().saveToStorage();
  },

  updateReagentBatch: (id, data) => {
    set((state) => ({
      reagentBatches: state.reagentBatches.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    }));
    get().saveToStorage();
  },

  createRunBatch: (name, operator) => {
    const newBatch: RunBatch = {
      id: generateId('run_'),
      batchNumber: generateBatchNumber(),
      name,
      runAt: new Date().toISOString(),
      operator,
      sampleCount: 0,
      anomalyCount: 0,
      status: 'running',
    };
    set((state) => ({
      runBatches: [...state.runBatches, newBatch],
      currentRunBatch: newBatch,
    }));
    get().saveToStorage();
    return newBatch;
  },

  runQcAnalysis: (runBatchId, sampleIds) => {
    const state = get();
    const qcResults: QcResult[] = [];
    const anomalies: Anomaly[] = [];

    const testItems = ['体重指数', '血糖浓度', '组织匀浆浓度'];

    for (const sampleId of sampleIds) {
      const sample = state.samples.find((s) => s.id === sampleId);
      if (!sample) continue;

      for (const testItem of testItems) {
        const formula = formulas.find(
          (f) =>
            (testItem === '体重指数' && f.code === 'BMI') ||
            (testItem === '血糖浓度' && f.code === 'BGC') ||
            (testItem === '组织匀浆浓度' && f.code === 'THC')
        );

        if (!formula) continue;

        const mockInputs = generateMockInputs(formula.parameters.map((p) => p.name));
        const calcResult = evaluateFormula(formula, mockInputs);

        const reagentBatch = state.reagentBatches.find((r) => r.isActive);

        const qcResult: QcResult = {
          id: generateId('qc_'),
          sampleId,
          reagentBatchId: reagentBatch?.id || null,
          runBatchId,
          testItem,
          resultValue: calcResult.value,
          unit: calcResult.unit,
          resultStatus: calcResult.status,
          formula: formula.expression,
          testedAt: new Date().toISOString(),
          referenceRange: formula.referenceRange,
          failureReason: calcResult.failureReason,
        };

        qcResults.push(qcResult);

        if (calcResult.status === 'abnormal' || calcResult.status === 'failed') {
          const category: AnomalyCategory = calcResult.status === 'failed'
            ? 'supplement'
            : 'recalibration';
          const severity: AnomalySeverity = calcResult.status === 'failed' ? 'high' : 'medium';

          anomalies.push({
            id: generateId('anomaly_'),
            sampleId,
            runBatchId,
            type: `${testItem}${calcResult.status === 'failed' ? '检测失败' : '质控异常'}`,
            severity,
            category,
            description:
              calcResult.failureReason ||
              `${testItem}检测结果超出参考范围，结果值: ${calcResult.value} ${calcResult.unit}`,
            suggestion:
              category === 'supplement'
                ? '请检查样本信息和输入参数是否完整，补充缺失数据后重测。'
                : '请核对检测方法和计算口径是否一致，必要时进行方法学验证。',
            status: 'pending',
            createdAt: new Date().toISOString(),
            resolvedAt: null,
            affectedSamples: [sampleId],
            formulaRef: formula.id,
          });
        }
      }
    }

    set((state) => ({
      qcResults: [...state.qcResults, ...qcResults],
      anomalies: [...state.anomalies, ...anomalies],
      runBatches: state.runBatches.map((rb) =>
        rb.id === runBatchId
          ? {
              ...rb,
              sampleCount: sampleIds.length,
              anomalyCount: anomalies.length,
              status: 'completed' as const,
            }
          : rb
      ),
      currentRunBatch: state.currentRunBatch?.id === runBatchId
        ? {
            ...state.currentRunBatch,
            sampleCount: sampleIds.length,
            anomalyCount: anomalies.length,
            status: 'completed',
          }
        : state.currentRunBatch,
    }));

    get().saveToStorage();
  },

  updateReagentAndRecalculate: (qcResultId, reagentBatchId) => {
    const state = get();
    const qcResult = state.qcResults.find((q) => q.id === qcResultId);
    if (!qcResult) return;

    const sample = state.samples.find((s) => s.id === qcResult.sampleId);
    const reagent = state.reagentBatches.find((r) => r.id === reagentBatchId);
    if (!sample || !reagent) return;

    const formula = formulas.find((f) => qcResult.formula.includes(f.expression));
    if (!formula) {
      set((state) => ({
        qcResults: state.qcResults.map((q) =>
          q.id === qcResultId ? { ...q, reagentBatchId } : q
        ),
      }));
      get().saveToStorage();
      return;
    }

    const mockInputs = generateMockInputs(formula.parameters.map((p) => p.name));
    const calcResult = evaluateFormula(formula, mockInputs);

    set((state) => ({
      qcResults: state.qcResults.map((q) =>
        q.id === qcResultId
          ? {
              ...q,
              reagentBatchId,
              resultValue: calcResult.value,
              resultStatus: calcResult.status,
              failureReason: calcResult.failureReason,
              testedAt: new Date().toISOString(),
            }
          : q
      ),
    }));

    const runBatchId = qcResult.runBatchId;
    const runBatchQcResults = state.qcResults.filter((q) => q.runBatchId === runBatchId);
    const newQcResults = runBatchQcResults.map((q) =>
      q.id === qcResultId
        ? { ...q, resultStatus: calcResult.status, reagentBatchId }
        : q
    );
    const anomalyCount = newQcResults.filter(
      (q) => q.resultStatus === 'abnormal' || q.resultStatus === 'failed'
    ).length;

    set((state) => ({
      runBatches: state.runBatches.map((rb) =>
        rb.id === runBatchId ? { ...rb, anomalyCount } : rb
      ),
    }));

    get().saveToStorage();
  },

  addAnomaly: (anomalyData) => {
    const newAnomaly: Anomaly = {
      ...anomalyData,
      id: generateId('anomaly_'),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ anomalies: [...state.anomalies, newAnomaly] }));
    get().saveToStorage();
  },

  updateAnomalyStatus: (id, status) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
            }
          : a
      ),
    }));
    get().saveToStorage();
  },

  getAnomaliesByCategory: (category) => {
    return get().anomalies.filter((a) => a.category === category);
  },

  loadFromStorage: () => {
    const cages = getStorageItem<Cage[]>('cages', []);
    const samples = getStorageItem<Sample[]>('samples', []);
    const qcResults = getStorageItem<QcResult[]>('qc_results', []);
    const reagentBatches = getStorageItem<ReagentBatch[]>('reagent_batches', []);
    const anomalies = getStorageItem<Anomaly[]>('anomalies', []);
    const runBatches = getStorageItem<RunBatch[]>('run_batches', []);

    set({
      cages,
      samples,
      qcResults,
      reagentBatches,
      anomalies,
      runBatches,
      currentRunBatch: runBatches.length > 0 ? runBatches[runBatches.length - 1] : null,
    });
  },

  saveToStorage: () => {
    const {
      cages,
      samples,
      qcResults,
      reagentBatches,
      anomalies,
      runBatches,
    } = get();
    setStorageItem('cages', cages);
    setStorageItem('samples', samples);
    setStorageItem('qc_results', qcResults);
    setStorageItem('reagent_batches', reagentBatches);
    setStorageItem('anomalies', anomalies);
    setStorageItem('run_batches', runBatches);
  },

  initMockData: () => {
    const now = new Date();
    const daysAgo = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    const mockCages: Cage[] = [
      {
        id: 'cage_mock_1',
        cageNumber: 'C-A01',
        location: '动物房A区1排',
        strain: 'C57BL/6',
        totalMice: 5,
        createdAt: daysAgo(30),
        updatedAt: daysAgo(5),
      },
      {
        id: 'cage_mock_2',
        cageNumber: 'C-A02',
        location: '动物房A区1排',
        strain: 'C57BL/6',
        totalMice: 4,
        createdAt: daysAgo(28),
        updatedAt: daysAgo(3),
      },
      {
        id: 'cage_mock_3',
        cageNumber: 'C-B01',
        location: '动物房B区2排',
        strain: 'BALB/c',
        totalMice: 6,
        createdAt: daysAgo(25),
        updatedAt: daysAgo(7),
      },
    ];

    const mockSamples: Sample[] = [
      {
        id: 'sample_mock_1',
        barcode: 'SAM20240601001',
        cageId: 'cage_mock_1',
        sampleType: '血液',
        collectionDate: '2024-06-01',
        collector: '张检验师',
        status: 'completed',
        remark: '空腹采血',
        createdAt: daysAgo(10),
      },
      {
        id: 'sample_mock_2',
        barcode: 'SAM20240601002',
        cageId: 'cage_mock_1',
        sampleType: '血液',
        collectionDate: '2024-06-01',
        collector: '张检验师',
        status: 'completed',
        remark: '',
        createdAt: daysAgo(10),
      },
      {
        id: 'sample_mock_3',
        barcode: 'SAM20240601001',
        cageId: 'cage_mock_2',
        sampleType: '肝脏',
        collectionDate: '2024-06-02',
        collector: '李检验师',
        status: 'testing',
        remark: '重复录入 - 待核实',
        createdAt: daysAgo(9),
      },
      {
        id: 'sample_mock_4',
        barcode: 'SAM20240602003',
        cageId: 'cage_mock_2',
        sampleType: '肾脏',
        collectionDate: '2024-06-02',
        collector: '李检验师',
        status: 'completed',
        remark: '',
        createdAt: daysAgo(8),
      },
      {
        id: 'sample_mock_5',
        barcode: 'SAM20240603004',
        cageId: 'cage_mock_3',
        sampleType: '血液',
        collectionDate: '2024-06-03',
        collector: '王检验师',
        status: 'pending',
        remark: '',
        createdAt: daysAgo(7),
      },
      {
        id: 'sample_mock_6',
        barcode: 'SAM20240603005',
        cageId: 'cage_mock_3',
        sampleType: '脑组织',
        collectionDate: '2024-06-03',
        collector: '王检验师',
        status: 'completed',
        remark: '低温保存',
        createdAt: daysAgo(6),
      },
    ];

    const mockReagents: ReagentBatch[] = [
      {
        id: 'reagent_mock_1',
        batchNumber: 'REAG-2024-001',
        reagentName: '血糖检测试剂盒',
        manufactureDate: '2024-03-15',
        expiryDate: '2025-03-14',
        supplier: '生化科技有限公司',
        isActive: true,
      },
      {
        id: 'reagent_mock_2',
        batchNumber: 'REAG-2024-002',
        reagentName: '蛋白定量试剂盒',
        manufactureDate: '2024-04-10',
        expiryDate: '2025-04-09',
        supplier: '生物试剂有限公司',
        isActive: false,
      },
    ];

    const mockRunBatch: RunBatch = {
      id: 'run_mock_1',
      batchNumber: 'RUN-20240610-0842',
      name: '2024年6月上旬质控批次',
      runAt: daysAgo(5),
      operator: '张检验师',
      sampleCount: 6,
      anomalyCount: 3,
      status: 'completed',
    };

    const mockQcResults: QcResult[] = [
      {
        id: 'qc_mock_1',
        sampleId: 'sample_mock_1',
        reagentBatchId: 'reagent_mock_1',
        runBatchId: 'run_mock_1',
        testItem: '体重指数',
        resultValue: 3.8,
        unit: 'g/cm²',
        resultStatus: 'normal',
        formula: 'weight / (bodyLength * bodyLength) * 100',
        testedAt: daysAgo(5),
        referenceRange: { min: 2.5, max: 5.0 },
      },
      {
        id: 'qc_mock_2',
        sampleId: 'sample_mock_1',
        reagentBatchId: 'reagent_mock_1',
        runBatchId: 'run_mock_1',
        testItem: '血糖浓度',
        resultValue: 6.2,
        unit: 'mmol/L',
        resultStatus: 'normal',
        formula: 'wholeBloodGlucose * (1 - 0.3 * hematocrit / 100) * correctionFactor',
        testedAt: daysAgo(5),
        referenceRange: { min: 3.9, max: 8.1 },
      },
      {
        id: 'qc_mock_3',
        sampleId: 'sample_mock_2',
        reagentBatchId: 'reagent_mock_1',
        runBatchId: 'run_mock_1',
        testItem: '体重指数',
        resultValue: 5.6,
        unit: 'g/cm²',
        resultStatus: 'abnormal',
        formula: 'weight / (bodyLength * bodyLength) * 100',
        testedAt: daysAgo(5),
        referenceRange: { min: 2.5, max: 5.0 },
        failureReason: '计算结果 5.60 g/cm² 超出参考范围 [2.5, 5.0] g/cm²',
      },
      {
        id: 'qc_mock_4',
        sampleId: 'sample_mock_2',
        reagentBatchId: 'reagent_mock_1',
        runBatchId: 'run_mock_1',
        testItem: '血糖浓度',
        resultValue: 9.5,
        unit: 'mmol/L',
        resultStatus: 'abnormal',
        formula: 'wholeBloodGlucose * (1 - 0.3 * hematocrit / 100) * correctionFactor',
        testedAt: daysAgo(5),
        referenceRange: { min: 3.9, max: 8.1 },
        failureReason: '计算结果 9.50 mmol/L 超出参考范围 [3.9, 8.1] mmol/L',
      },
      {
        id: 'qc_mock_5',
        sampleId: 'sample_mock_4',
        reagentBatchId: null,
        runBatchId: 'run_mock_1',
        testItem: '组织匀浆浓度',
        resultValue: 128.5,
        unit: 'μg/g',
        resultStatus: 'pending',
        formula: 'measuredConcentration * homogenateVolume / tissueWeight',
        testedAt: daysAgo(4),
      },
    ];

    const mockAnomalies: Anomaly[] = [
      {
        id: 'anomaly_mock_1',
        sampleId: 'sample_mock_1',
        runBatchId: 'run_mock_1',
        type: '样本条码重复',
        severity: 'high',
        category: 'supplement',
        description: '条码 "SAM20240601001" 出现 2 次重复，分别来自笼位 C-A01 和 C-A02，可能导致检测结果混淆。',
        suggestion: '请核实条码信息，修正重复条码后重新录入。如为同一样本复测，请在备注中注明并关联原样本。',
        status: 'pending',
        createdAt: daysAgo(9),
        resolvedAt: null,
        affectedSamples: ['sample_mock_1', 'sample_mock_3'],
      },
      {
        id: 'anomaly_mock_2',
        sampleId: 'sample_mock_2',
        runBatchId: 'run_mock_1',
        type: '体重指数质控异常',
        severity: 'medium',
        category: 'recalibration',
        description: '样本 SAM20240601002 体重指数为 5.6 g/cm²，超出参考范围上限 5.0 g/cm²，偏离度 12%。',
        suggestion: '请核对检测方法和计算口径是否一致，检查该笼位小鼠是否有肥胖表型，必要时进行方法学验证。',
        status: 'processing',
        createdAt: daysAgo(5),
        resolvedAt: null,
        affectedSamples: ['sample_mock_2'],
        formulaRef: 'body-weight-index',
      },
      {
        id: 'anomaly_mock_3',
        sampleId: 'sample_mock_5',
        runBatchId: 'run_mock_1',
        type: '试剂批号缺失',
        severity: 'medium',
        category: 'supplement',
        description: '样本 SAM20240603004 的组织匀浆浓度检测未关联试剂批号，无法追溯试剂来源。',
        suggestion: '请补录对应的试剂批号信息，补录后系统将自动更新质控结果。',
        status: 'pending',
        createdAt: daysAgo(4),
        resolvedAt: null,
        affectedSamples: ['sample_mock_5'],
      },
    ];

    set({
      cages: mockCages,
      samples: mockSamples,
      qcResults: mockQcResults,
      reagentBatches: mockReagents,
      anomalies: mockAnomalies,
      runBatches: [mockRunBatch],
      currentRunBatch: mockRunBatch,
    });

    get().saveToStorage();
  },
}));

function generateMockInputs(paramNames: string[]): Record<string, number> {
  const inputs: Record<string, number> = {};
  for (const name of paramNames) {
    if (name === 'weight') {
      inputs[name] = 20 + Math.random() * 15;
    } else if (name === 'bodyLength') {
      inputs[name] = 8 + Math.random() * 4;
    } else if (name === 'wholeBloodGlucose') {
      inputs[name] = 5 + Math.random() * 5;
    } else if (name === 'hematocrit') {
      inputs[name] = 40 + Math.random() * 15;
    } else if (name === 'correctionFactor') {
      inputs[name] = 1.05 + Math.random() * 0.15;
    } else if (name === 'measuredConcentration') {
      inputs[name] = 50 + Math.random() * 100;
    } else if (name === 'homogenateVolume') {
      inputs[name] = 1 + Math.random() * 2;
    } else if (name === 'tissueWeight') {
      inputs[name] = 0.1 + Math.random() * 0.5;
    } else if (name === 'survivalCount') {
      inputs[name] = Math.floor(Math.random() * 10);
    } else if (name === 'totalCount') {
      inputs[name] = 10;
    } else if (name === 'standardDeviation') {
      inputs[name] = 0.2 + Math.random() * 0.5;
    } else if (name === 'meanValue') {
      inputs[name] = 5 + Math.random() * 5;
    } else {
      inputs[name] = 1 + Math.random() * 10;
    }
  }
  return inputs;
}
