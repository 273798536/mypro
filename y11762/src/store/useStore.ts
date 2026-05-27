import { create } from 'zustand';
import { AppState, RegionData, AnomalyRecord, ImportMode, MetricType } from '../types';
import { SAMPLE_DATA } from '../data/sampleData';

function detectAnomaliesForRegions(regions: RegionData[]): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];

  const claimAmounts = regions.map(r => r.claimAmount);
  const mean = claimAmounts.reduce((a, b) => a + b, 0) / claimAmounts.length;
  const stdDev = Math.sqrt(claimAmounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / claimAmounts.length);

  for (const region of regions) {
    if (region.premium > 0) {
      const claimRatio = region.claimAmount / region.premium;
      if (claimRatio > 2.0) {
        anomalies.push({
          region: region.region,
          type: 'ratio_mismatch',
          message: `赔付率 ${(claimRatio * 100).toFixed(1)}% 异常偏高，出险率与赔付额/保费比例不一致，请核实数据`,
          severity: 'critical',
        });
      } else if (claimRatio < 0.1) {
        anomalies.push({
          region: region.region,
          type: 'ratio_mismatch',
          message: `赔付率 ${(claimRatio * 100).toFixed(1)}% 异常偏低，出险率与赔付额/保费比例不一致，请核实数据`,
          severity: 'warning',
        });
      }
    }

    if (stdDev > 0 && region.claimAmount > mean + 3 * stdDev) {
      anomalies.push({
        region: region.region,
        type: 'extreme_claim',
        message: `赔付额 ${region.claimAmount} 万元极端偏高（均值 ${mean.toFixed(0)}，3σ=${(mean + 3 * stdDev).toFixed(0)}），可能遮挡其他地区差异，建议使用对数刻度`,
        severity: 'critical',
      });
    }

    if (region.revisionHistory.some(r => r.reason === '地区合并')) {
      anomalies.push({
        region: region.region,
        type: 'region_merge',
        message: '该地区存在合并数据，请注意数值可能为累计值',
        severity: 'warning',
      });
    }
  }

  return anomalies;
}

function loadDataFromStorage(): RegionData[] {
  try {
    const stored = localStorage.getItem('insurance-risk-regions');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return [];
}

function saveDataToStorage(regions: RegionData[]) {
  try {
    localStorage.setItem('insurance-risk-regions', JSON.stringify(regions));
  } catch {}
}

export const useStore = create<AppState>((set, get) => ({
  regions: loadDataFromStorage(),
  anomalies: [],
  activeMetric: 'claimRate' as MetricType,
  selectedRegion: null,
  hoveredRegion: null,
  filterRegions: [],
  importMode: 'overwrite' as ImportMode,
  showDetail: false,
  showImport: false,

  setActiveMetric: (metric: MetricType) => set({ activeMetric: metric }),
  setSelectedRegion: (region: string | null) => set({ selectedRegion: region, showDetail: region !== null }),
  setHoveredRegion: (region: string | null) => set({ hoveredRegion: region }),
  setFilterRegions: (regions: string[]) => set({ filterRegions: regions }),
  setImportMode: (mode: ImportMode) => set({ importMode: mode }),
  setShowDetail: (show: boolean) => set({ showDetail: show }),
  setShowImport: (show: boolean) => set({ showImport: show }),

  importData: (newRegions: RegionData[]) => {
    const state = get();
    const mode = state.importMode;
    const existingMap = new Map(state.regions.map(r => [r.region, r]));
    const timestamp = new Date().toISOString();

    for (const newRegion of newRegions) {
      const existing = existingMap.get(newRegion.region);

      if (existing) {
        if (mode === 'ignore') {
          continue;
        } else if (mode === 'overwrite') {
          const revisions = [];
          const fields: (keyof RegionData)[] = ['policyCount', 'claimRate', 'premium', 'claimAmount', 'actuarialNote', 'source'];
          for (const field of fields) {
            if (existing[field] !== newRegion[field]) {
              revisions.push({
                timestamp,
                field,
                oldValue: existing[field] as number | string,
                newValue: newRegion[field] as number | string,
                reason: '导入覆盖',
              });
            }
          }
          existingMap.set(newRegion.region, {
            ...newRegion,
            id: existing.id,
            revisionHistory: [...existing.revisionHistory, ...revisions],
          });
        } else if (mode === 'append') {
          const merged: RegionData = {
            ...existing,
            policyCount: existing.policyCount + newRegion.policyCount,
            claimRate: (existing.claimRate + newRegion.claimRate) / 2,
            premium: existing.premium + newRegion.premium,
            claimAmount: existing.claimAmount + newRegion.claimAmount,
            actuarialNote: existing.actuarialNote + '；' + newRegion.actuarialNote,
            source: existing.source + ' + ' + newRegion.source,
            revisionHistory: [
              ...existing.revisionHistory,
              {
                timestamp,
                field: 'policyCount',
                oldValue: existing.policyCount,
                newValue: existing.policyCount + newRegion.policyCount,
                reason: '地区合并',
              },
              {
                timestamp,
                field: 'premium',
                oldValue: existing.premium,
                newValue: existing.premium + newRegion.premium,
                reason: '地区合并',
              },
              {
                timestamp,
                field: 'claimAmount',
                oldValue: existing.claimAmount,
                newValue: existing.claimAmount + newRegion.claimAmount,
                reason: '地区合并',
              },
            ],
          };
          existingMap.set(newRegion.region, merged);
        }
      } else {
        existingMap.set(newRegion.region, { ...newRegion, revisionHistory: [...newRegion.revisionHistory] });
      }
    }

    const regions = Array.from(existingMap.values());
    const anomalies = detectAnomaliesForRegions(regions);
    saveDataToStorage(regions);
    set({ regions, anomalies });
  },

  detectAnomalies: () => {
    const { regions } = get();
    const anomalies = detectAnomaliesForRegions(regions);
    set({ anomalies });
  },

  loadSampleData: () => {
    const regions = SAMPLE_DATA.map(r => ({ ...r, revisionHistory: [...r.revisionHistory] }));
    const anomalies = detectAnomaliesForRegions(regions);
    saveDataToStorage(regions);
    set({ regions, anomalies, filterRegions: [], selectedRegion: null });
  },
}));
