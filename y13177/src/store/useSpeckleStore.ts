import { create } from 'zustand';
import type {
  SpeckleDataset,
  AnomalyInfo,
  VersionSnapshot,
  DeviceParams,
  MaterialParams,
  SupplementItem,
  ChangeType,
} from '@/types';
import { computeSpeckleData, nowTimestamp, bumpVersion } from '@/utils/speckleEngine';

interface SpeckleState {
  dataset: SpeckleDataset | null;
  selectedVersionId: string | null;
  selectedAnomaly: AnomalyInfo | null;
  isSummaryOpen: boolean;
  isRerunning: boolean;
  rerunProgress: number;
  isParamPanelOpen: boolean;
  paramPanelTab: 'device' | 'material' | 'supplement';

  loadSample: () => void;
  selectAnomaly: (anomaly: AnomalyInfo | null) => void;
  setSummaryOpen: (open: boolean) => void;
  selectVersion: (versionId: string) => void;
  startRerun: () => void;

  setParamPanelOpen: (open: boolean) => void;
  setParamPanelTab: (tab: 'device' | 'material' | 'supplement') => void;

  updateDeviceParams: (params: Partial<DeviceParams>) => void;
  updateMaterialParams: (params: Partial<MaterialParams>) => void;
  addSupplement: (item: Omit<SupplementItem, 'id' | 'timestamp' | 'operatorName'>) => void;

  getCurrentSnapshot: () => VersionSnapshot | null;
  getDeviceParams: () => DeviceParams | null;
  getMaterialParams: () => MaterialParams | null;
  getSupplements: () => SupplementItem[];
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createInitialSnapshots(): VersionSnapshot[] {
  const deviceParams: DeviceParams = {
    deviceName: 'LS-2000 激光散斑检测仪',
    nameplateLine: '铭牌-第3行',
    intensityMin: 0.7,
    intensityMax: 1.0,
    contrastMin: 0.3,
    contrastMax: 0.6,
    stabilityThreshold: 0.8,
    vibrationLimit: 0.5,
  };

  const materialParams: MaterialParams = {
    materialName: '6061-T6 铝合金试样 #A-042',
    materialReportLine: '材料报告-第2行',
    surfaceRoughness: 0.8,
    hardness: 95,
    sampleId: 'A-042',
  };

  const v1Result = computeSpeckleData(deviceParams, materialParams, [], 17);
  const v1: VersionSnapshot = {
    id: 'snap-v1',
    version: 'v1.0',
    timestamp: '2026-06-10 15:02',
    changeType: '初始',
    description: '首次上传原始采集数据，共 20 个采样点',
    operatorName: '小宋',
    dataPoints: v1Result.dataPoints,
    summary: {
      paramVersion: 'v1.0（2026-06-10 15:02）',
      anomalyCount: v1Result.anomalies.length,
      conclusion: v1Result.conclusion,
    },
    deviceParams,
    materialParams,
    supplements: [],
  };

  const sup1: SupplementItem = {
    id: 'sup-001',
    sourceName: '设备铭牌-LS2000',
    sourceType: '铭牌',
    content: '出厂标定强度范围：0.70 ~ 1.00，校准日期 2026-03-15',
    lineNumber: 7,
    anomalyId: 'anom-001',
    timestamp: '2026-06-11 09:30',
    operatorName: '小宋',
  };

  const v2Result = computeSpeckleData(deviceParams, materialParams, [sup1], 17);
  const v2: VersionSnapshot = {
    id: 'snap-v2',
    version: 'v1.1',
    timestamp: '2026-06-11 09:30',
    changeType: '补充',
    description: '补充设备铭牌校准信息，新增 anom-001 的证据来源',
    operatorName: '小宋',
    dataPoints: v2Result.dataPoints,
    summary: {
      paramVersion: 'v1.1（2026-06-11 09:30）',
      anomalyCount: v2Result.anomalies.length,
      conclusion: v2Result.conclusion,
    },
    deviceParams,
    materialParams,
    supplements: [sup1],
  };

  const sup2: SupplementItem = {
    id: 'sup-002',
    sourceName: '实验室操作日志-20260610',
    sourceType: '操作日志',
    content: '14:32 隔壁振动台启动，持续约 2 分钟，本设备未暂停',
    lineNumber: 15,
    anomalyId: 'anom-002',
    timestamp: '2026-06-12 16:45',
    operatorName: '小宋',
  };
  const sup3: SupplementItem = {
    id: 'sup-003',
    sourceName: '实验室操作日志-20260610',
    sourceType: '操作日志',
    content: '14:47 设备自动触发过热保护，冷却 30 秒后恢复采集',
    lineNumber: 22,
    anomalyId: 'anom-003',
    timestamp: '2026-06-12 16:45',
    operatorName: '小宋',
  };

  const v3Result = computeSpeckleData(deviceParams, materialParams, [sup1, sup2, sup3], 17);
  const v3: VersionSnapshot = {
    id: 'snap-v3',
    version: 'v1.2',
    timestamp: '2026-06-12 16:45',
    changeType: '补充',
    description: '补充操作日志记录，标注 anom-002 和 anom-003 的环境因素',
    operatorName: '小宋',
    dataPoints: v3Result.dataPoints,
    summary: {
      paramVersion: 'v1.2（2026-06-12 16:45）',
      anomalyCount: v3Result.anomalies.length,
      conclusion: v3Result.conclusion,
    },
    deviceParams,
    materialParams,
    supplements: [sup1, sup2, sup3],
  };

  const deviceParamsV4: DeviceParams = {
    ...deviceParams,
    stabilityThreshold: 0.75,
  };
  const v4Result = computeSpeckleData(deviceParamsV4, materialParams, [sup1, sup2, sup3], 23);
  const v4: VersionSnapshot = {
    id: 'snap-v4',
    version: 'v1.3',
    timestamp: '2026-06-13 10:15',
    changeType: '修正',
    description: '修正稳定性判断阈值（0.80 → 0.75），更新 anom-002 影响范围',
    operatorName: '小宋',
    dataPoints: v4Result.dataPoints,
    summary: {
      paramVersion: 'v1.3（2026-06-13 10:15）',
      anomalyCount: v4Result.anomalies.length,
      conclusion: v4Result.conclusion,
    },
    deviceParams: deviceParamsV4,
    materialParams,
    supplements: [sup1, sup2, sup3],
  };

  return [v1, v2, v3, v4];
}

export const useSpeckleStore = create<SpeckleState>((set, get) => ({
  dataset: null,
  selectedVersionId: null,
  selectedAnomaly: null,
  isSummaryOpen: false,
  isRerunning: false,
  rerunProgress: 0,
  isParamPanelOpen: false,
  paramPanelTab: 'device',

  loadSample: () => {
    const snapshots = createInitialSnapshots();
    const latest = snapshots[snapshots.length - 1];
    set({
      dataset: { id: 'spk-2026-001', snapshots },
      selectedVersionId: latest.id,
      selectedAnomaly: null,
    });
  },

  selectAnomaly: (anomaly) => {
    set({ selectedAnomaly: anomaly });
  },

  setSummaryOpen: (open) => {
    set({ isSummaryOpen: open });
  },

  selectVersion: (versionId) => {
    set({ selectedVersionId: versionId, selectedAnomaly: null });
  },

  setParamPanelOpen: (open) => {
    set({ isParamPanelOpen: open });
  },

  setParamPanelTab: (tab) => {
    set({ paramPanelTab: tab });
  },

  startRerun: () => {
    const snap = get().getCurrentSnapshot();
    if (!snap) return;

    set({ isRerunning: true, rerunProgress: 0 });

    const totalSteps = 12;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = Math.min(Math.round((step / totalSteps) * 100), 100);
      set({ rerunProgress: progress });

      if (step >= totalSteps) {
        clearInterval(interval);

        const currentSnap = get().getCurrentSnapshot();
        if (!currentSnap) return;

        const seed = Math.floor(Math.random() * 1000) + 1;
        const result = computeSpeckleData(
          currentSnap.deviceParams,
          currentSnap.materialParams,
          currentSnap.supplements,
          seed
        );

        const newVersion = bumpVersion(currentSnap.version, '修正');
        const now = nowTimestamp();
        const newSnap: VersionSnapshot = {
          id: genId('snap'),
          version: newVersion,
          timestamp: now,
          changeType: '修正',
          description: `重跑参数计算，基于 ${currentSnap.version} 的参数配置重新生成数据`,
          operatorName: '小宋',
          dataPoints: result.dataPoints,
          summary: {
            paramVersion: `${newVersion}（${now}）`,
            anomalyCount: result.anomalies.length,
            conclusion: result.conclusion,
          },
          deviceParams: { ...currentSnap.deviceParams },
          materialParams: { ...currentSnap.materialParams },
          supplements: [...currentSnap.supplements],
        };

        const dataset = get().dataset;
        if (!dataset) return;

        set({
          dataset: {
            ...dataset,
            snapshots: [...dataset.snapshots, newSnap],
          },
          selectedVersionId: newSnap.id,
          isRerunning: false,
          rerunProgress: 100,
        });

        setTimeout(() => set({ rerunProgress: 0 }), 1000);
      }
    }, 120);
  },

  updateDeviceParams: (params) => {
    const dataset = get().dataset;
    const currentSnap = get().getCurrentSnapshot();
    if (!dataset || !currentSnap) return;

    const newDeviceParams = { ...currentSnap.deviceParams, ...params };
    const seed = Math.floor(Math.random() * 1000) + 1;
    const result = computeSpeckleData(
      newDeviceParams,
      currentSnap.materialParams,
      currentSnap.supplements,
      seed
    );

    const newVersion = bumpVersion(currentSnap.version, '修正');
    const now = nowTimestamp();
    const changedKeys = Object.keys(params).join('、');
    const newSnap: VersionSnapshot = {
      id: genId('snap'),
      version: newVersion,
      timestamp: now,
      changeType: '修正',
      description: `修正设备参数（${changedKeys}），重新计算散斑特征`,
      operatorName: '小宋',
      dataPoints: result.dataPoints,
      summary: {
        paramVersion: `${newVersion}（${now}）`,
        anomalyCount: result.anomalies.length,
        conclusion: result.conclusion,
      },
      deviceParams: newDeviceParams,
      materialParams: { ...currentSnap.materialParams },
      supplements: [...currentSnap.supplements],
    };

    set({
      dataset: {
        ...dataset,
        snapshots: [...dataset.snapshots, newSnap],
      },
      selectedVersionId: newSnap.id,
    });
  },

  updateMaterialParams: (params) => {
    const dataset = get().dataset;
    const currentSnap = get().getCurrentSnapshot();
    if (!dataset || !currentSnap) return;

    const newMaterialParams = { ...currentSnap.materialParams, ...params };
    const seed = Math.floor(Math.random() * 1000) + 1;
    const result = computeSpeckleData(
      currentSnap.deviceParams,
      newMaterialParams,
      currentSnap.supplements,
      seed
    );

    const newVersion = bumpVersion(currentSnap.version, '修正');
    const now = nowTimestamp();
    const changedKeys = Object.keys(params).join('、');
    const newSnap: VersionSnapshot = {
      id: genId('snap'),
      version: newVersion,
      timestamp: now,
      changeType: '修正',
      description: `修正材料参数（${changedKeys}），重新计算散斑特征`,
      operatorName: '小宋',
      dataPoints: result.dataPoints,
      summary: {
        paramVersion: `${newVersion}（${now}）`,
        anomalyCount: result.anomalies.length,
        conclusion: result.conclusion,
      },
      deviceParams: { ...currentSnap.deviceParams },
      materialParams: newMaterialParams,
      supplements: [...currentSnap.supplements],
    };

    set({
      dataset: {
        ...dataset,
        snapshots: [...dataset.snapshots, newSnap],
      },
      selectedVersionId: newSnap.id,
    });
  },

  addSupplement: (item) => {
    const dataset = get().dataset;
    const currentSnap = get().getCurrentSnapshot();
    if (!dataset || !currentSnap) return;

    const newItem: SupplementItem = {
      ...item,
      id: genId('sup'),
      timestamp: nowTimestamp(),
      operatorName: '小宋',
    };

    const newSupplements = [...currentSnap.supplements, newItem];
    const seed = Math.floor(Math.random() * 1000) + 1;
    const result = computeSpeckleData(
      currentSnap.deviceParams,
      currentSnap.materialParams,
      newSupplements,
      seed
    );

    const newVersion = bumpVersion(currentSnap.version, '补充');
    const now = nowTimestamp();
    const newSnap: VersionSnapshot = {
      id: genId('snap'),
      version: newVersion,
      timestamp: now,
      changeType: '补充',
      description: `补充材料：${item.sourceName}（第${item.lineNumber}行）`,
      operatorName: '小宋',
      dataPoints: result.dataPoints,
      summary: {
        paramVersion: `${newVersion}（${now}）`,
        anomalyCount: result.anomalies.length,
        conclusion: result.conclusion,
      },
      deviceParams: { ...currentSnap.deviceParams },
      materialParams: { ...currentSnap.materialParams },
      supplements: newSupplements,
    };

    set({
      dataset: {
        ...dataset,
        snapshots: [...dataset.snapshots, newSnap],
      },
      selectedVersionId: newSnap.id,
    });
  },

  getCurrentSnapshot: () => {
    const { dataset, selectedVersionId } = get();
    if (!dataset || !selectedVersionId) return null;
    return dataset.snapshots.find((s) => s.id === selectedVersionId) || null;
  },

  getDeviceParams: () => {
    const snap = get().getCurrentSnapshot();
    return snap?.deviceParams || null;
  },

  getMaterialParams: () => {
    const snap = get().getCurrentSnapshot();
    return snap?.materialParams || null;
  },

  getSupplements: () => {
    const snap = get().getCurrentSnapshot();
    return snap?.supplements || [];
  },
}));
