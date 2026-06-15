import { create } from 'zustand';
import type {
  ProcessingRecord,
  AnomalyPoint,
  DataGap,
  ReviewEntry,
  RiskNotice,
  BuoyData,
  ShipTrack,
  AquacultureLog,
  SalinityData,
} from '@/types';
import { generateId, convertSalinityToPsu, haversineDistance, getRiskColor } from '@/utils/geo';
import { useDataStore } from './useDataStore';

interface ProcessState {
  records: ProcessingRecord[];
  currentBatchId: string;
  isProcessing: boolean;
  activeRecordId: string | null;
}

interface ProcessActions {
  runProcessing: () => void;
  setActiveRecord: (id: string | null) => void;
  addReviewEntry: (recordId: string, entry: Omit<ReviewEntry, 'id' | 'recordId'>) => void;
  correctData: (recordId: string, correctedData: Record<string, unknown>) => void;
  getRecordsBySource: (sourceType: string) => ProcessingRecord[];
  getAnomaliesByRiskLevel: (level: string) => AnomalyPoint[];
  getAllAnomalies: () => AnomalyPoint[];
  getAllDataGaps: () => DataGap[];
  getRelatedNotice: (anomalyId: string) => RiskNotice | undefined;
}

export const useProcessStore = create<ProcessState & ProcessActions>((set, get) => ({
  records: [],
  currentBatchId: generateId('batch'),
  isProcessing: false,
  activeRecordId: null,

  setActiveRecord: (id) => set({ activeRecordId: id }),

  runProcessing: () => {
    set({ isProcessing: true });
    const { currentBatchId } = get();
    const dataState = useDataStore.getState();
    const records: ProcessingRecord[] = [];

    const riskNoticeRecord: ProcessingRecord = {
      id: generateId('rec'),
      batchId: currentBatchId,
      processedAt: new Date().toISOString(),
      sourceType: 'risk_notice',
      status: 'completed',
      rawData: { notices: dataState.riskNotices },
      cleanedData: { notices: dataState.riskNotices },
      riskLevel: 'high',
      anomalies: [],
      dataGaps: [],
      reviewStatus: 'unreviewed',
      reviewEntries: [],
    };
    records.push(riskNoticeRecord);

    const buoyAnomalies: AnomalyPoint[] = [];
    const buoyGaps: DataGap[] = [];
    dataState.buoys.forEach((buoy) => {
      if (buoy.isOffline) {
        buoyAnomalies.push({
          id: generateId('anom'),
          recordId: '',
          type: 'buoy_offline',
          timestamp: buoy.lastOnline || buoy.timestamp,
          latitude: buoy.latitude,
          longitude: buoy.longitude,
          description: `浮标 ${buoy.buoyId} 离线，最后在线时间 ${buoy.lastOnline || '未知'}`,
          relatedNoticeId: 'notice-002',
          riskLevel: 'medium',
        });
      }
    });

    const buoyRecord: ProcessingRecord = {
      id: generateId('rec'),
      batchId: currentBatchId,
      processedAt: new Date().toISOString(),
      sourceType: 'buoy',
      status: buoyGaps.length > 0 ? 'partial' : 'completed',
      rawData: { buoys: dataState.buoys },
      cleanedData: { buoys: dataState.buoys.filter((b) => !b.isOffline) },
      riskLevel: 'high',
      anomalies: buoyAnomalies.map((a) => ({ ...a })),
      dataGaps: buoyGaps,
      reviewStatus: 'unreviewed',
      reviewEntries: [],
    };
    buoyRecord.anomalies.forEach((a) => {
      a.recordId = buoyRecord.id;
    });
    records.push(buoyRecord);

    const shipAnomalies: AnomalyPoint[] = [];
    const shipsByTrack = dataState.shipTracks.reduce((acc, track) => {
      if (!acc[track.shipId]) acc[track.shipId] = [];
      acc[track.shipId].push(track);
      return acc;
    }, {} as Record<string, ShipTrack[]>);

    Object.entries(shipsByTrack).forEach(([shipId, tracks]) => {
      const sorted = tracks.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const dist = haversineDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
        const hours =
          (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) /
          3600000;
        const speed = hours > 0 ? dist / hours : 0;
        if (speed < 5 && curr.speed < 5) {
          shipAnomalies.push({
            id: generateId('anom'),
            recordId: '',
            type: 'track_deviation',
            timestamp: curr.timestamp,
            latitude: curr.latitude,
            longitude: curr.longitude,
            description: `船舶 ${curr.shipName} 低速停留，航速约 ${curr.speed.toFixed(1)} 节`,
            relatedNoticeId: 'notice-001',
            riskLevel: 'high',
          });
          break;
        }
      }
    });

    const shipRecord: ProcessingRecord = {
      id: generateId('rec'),
      batchId: currentBatchId,
      processedAt: new Date().toISOString(),
      sourceType: 'ship',
      status: 'completed',
      rawData: { ships: dataState.shipTracks },
      cleanedData: { ships: dataState.shipTracks },
      riskLevel: 'medium',
      anomalies: shipAnomalies.map((a) => ({ ...a })),
      dataGaps: [],
      reviewStatus: 'unreviewed',
      reviewEntries: [],
    };
    shipRecord.anomalies.forEach((a) => {
      a.recordId = shipRecord.id;
    });
    records.push(shipRecord);

    const aquaAnomalies: AnomalyPoint[] = [];
    const aquaGaps: DataGap[] = [];
    dataState.aquacultureLogs.forEach((log) => {
      if (!log.salinity || !log.waterQuality) {
        aquaGaps.push({
          id: generateId('gap'),
          recordId: '',
          missingType: 'water_quality_missing',
          description: `养殖区 ${log.farmName} 当日水质数据缺失`,
          impact: '无法评估该养殖区受溢油影响程度，相关风险结论仅供参考',
          suggestion: '请潜水教练补录当日人工巡视记录或设备检测数据',
          affectedRecords: [],
        });
      }
      if (log.notes.includes('柴油味') || log.notes.includes('油膜')) {
        aquaAnomalies.push({
          id: generateId('anom'),
          recordId: '',
          type: 'oil_spill',
          timestamp: log.logDate + 'T12:00:00',
          latitude: log.latitude,
          longitude: log.longitude,
          description: `养殖区 ${log.farmName} 发现疑似油污染迹象：${log.notes}`,
          relatedNoticeId: 'notice-001',
          riskLevel: 'high',
        });
      }
    });

    const aquaRecord: ProcessingRecord = {
      id: generateId('rec'),
      batchId: currentBatchId,
      processedAt: new Date().toISOString(),
      sourceType: 'aquaculture',
      status: aquaGaps.length > 0 ? 'partial' : 'completed',
      rawData: { logs: dataState.aquacultureLogs },
      cleanedData: {
        logs: dataState.aquacultureLogs.filter((l) => l.salinity && l.waterQuality),
      },
      riskLevel: 'medium',
      anomalies: aquaAnomalies.map((a) => ({ ...a })),
      dataGaps: aquaGaps.map((g) => ({ ...g })),
      reviewStatus: 'unreviewed',
      reviewEntries: [],
    };
    aquaRecord.anomalies.forEach((a) => {
      a.recordId = aquaRecord.id;
    });
    aquaRecord.dataGaps.forEach((g) => {
      g.recordId = aquaRecord.id;
      g.affectedRecords = [aquaRecord.id];
    });
    records.push(aquaRecord);

    const salAnomalies: AnomalyPoint[] = [];
    const normalizedSalinity = dataState.salinityDataList.map((s) => ({
      ...s,
      salinityPsu: convertSalinityToPsu(s.salinity, s.unit),
    }));
    const avgSal =
      normalizedSalinity.reduce((sum, s) => sum + s.salinityPsu, 0) / normalizedSalinity.length;
    normalizedSalinity.forEach((s) => {
      if (Math.abs(s.salinityPsu - avgSal) / avgSal > 0.1) {
        salAnomalies.push({
          id: generateId('anom'),
          recordId: '',
          type: 'salinity_anomaly',
          timestamp: s.timestamp,
          latitude: s.latitude,
          longitude: s.longitude,
          description: `盐度站 ${s.stationName} 盐度 ${s.salinityPsu.toFixed(1)} PSU 偏离平均值 ${avgSal.toFixed(1)} PSU 较多，单位原数据为 ${s.salinity} ${s.unit}`,
          riskLevel: 'low',
        });
      }
    });

    const salRecord: ProcessingRecord = {
      id: generateId('rec'),
      batchId: currentBatchId,
      processedAt: new Date().toISOString(),
      sourceType: 'salinity',
      status: 'completed',
      rawData: { stations: dataState.salinityDataList },
      cleanedData: { stations: normalizedSalinity },
      riskLevel: 'low',
      anomalies: salAnomalies.map((a) => ({ ...a })),
      dataGaps: [],
      reviewStatus: 'unreviewed',
      reviewEntries: [],
    };
    salRecord.anomalies.forEach((a) => {
      a.recordId = salRecord.id;
    });
    records.push(salRecord);

    console.log(
      `%c[海面溢油复盘] 处理完成：共 ${records.length} 条记录，${records.reduce((s, r) => s + r.anomalies.length, 0)} 个异常点，${records.reduce((s, r) => s + r.dataGaps.length, 0)} 个数据缺口`,
      'background:#0a2540;color:#74c0fc;padding:4px 8px;border-radius:4px;'
    );
    console.log(
      '%c[海面溢油复盘] 复核入口：点击任意异常点可追溯风险通报，或直接调用 useProcessStore.getState() 查看详情',
      'color:#ff6b35;'
    );

    set({ records, isProcessing: false });
  },

  addReviewEntry: (recordId, entry) =>
    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              reviewEntries: [...r.reviewEntries, { ...entry, id: generateId('rev'), recordId }],
              reviewStatus: 'reviewed',
            }
          : r
      ),
    })),

  correctData: (recordId, correctedData) => {
    const state = get();
    const record = state.records.find((r) => r.id === recordId);
    if (!record) return;

    set({
      records: state.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              cleanedData: { ...r.cleanedData, ...correctedData },
              status: 'completed',
              dataGaps: r.dataGaps.filter(
                (g) =>
                  !(
                    g.missingType === 'water_quality_missing' &&
                    correctedData.logs &&
                    (correctedData.logs as AquacultureLog[]).length > 0
                  )
              ),
            }
          : r
      ),
    });
  },

  getRecordsBySource: (sourceType) => {
    return get().records.filter((r) => r.sourceType === sourceType);
  },

  getAnomaliesByRiskLevel: (level) => {
    return get()
      .records.flatMap((r) => r.anomalies)
      .filter((a) => a.riskLevel === level);
  },

  getAllAnomalies: () => {
    return get().records.flatMap((r) => r.anomalies);
  },

  getAllDataGaps: () => {
    return get().records.flatMap((r) => r.dataGaps);
  },

  getRelatedNotice: (anomalyId) => {
    const anomaly = get()
      .records.flatMap((r) => r.anomalies)
      .find((a) => a.id === anomalyId);
    if (!anomaly?.relatedNoticeId) return undefined;
    return useDataStore
      .getState()
      .riskNotices.find((n) => n.id === anomaly.relatedNoticeId);
  },
}));
