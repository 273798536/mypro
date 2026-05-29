import { create } from 'zustand';
import type { Asset, RiskLevel } from '../types/asset';
import type { AnalysisResult, RunType, ChangePoint } from '../types/analysis';
import { useDataStore } from './dataStore';
import { useUIStore } from './uiStore';
import { createAnalysisResult, detectChanges } from '../engine/dataProcessor';
import { detectAllAnomalies } from '../engine/anomalyDetector';
import { classifyAssets } from '../engine/classifier';

interface AnalysisState {
  runAnalysis: (runType: RunType, assets: Asset[]) => AnalysisResult;
  runFullAnalysis: () => void;
  runSecondAnalysis: (secondRunAssets: Asset[]) => void;
  filterAssetsByIndustry: (assets: Asset[], industries: string[]) => Asset[];
  filterAssetsByRisk: (assets: Asset[], riskLevel: RiskLevel | 'all') => Asset[];
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  runAnalysis: (runType: RunType, assets: Asset[]): AnalysisResult => {
    const thresholds = useUIStore.getState().riskThresholds;
    const selectedIndustries = useUIStore.getState().selectedIndustries;
    
    let changes: ChangePoint[] | undefined;
    if (runType === 'second') {
      const firstRunResult = useDataStore.getState().firstRunResult;
      if (firstRunResult) {
        changes = detectChanges(firstRunResult.assets, assets);
      }
    }
    
    let result = createAnalysisResult(assets, runType, thresholds, changes);
    
    const filteredAssets = get().filterAssetsByIndustry(result.assets, selectedIndustries);
    const anomalies = detectAllAnomalies(result.assets, filteredAssets);
    const categories = classifyAssets(filteredAssets, anomalies);
    
    result = {
      ...result,
      anomalies,
      categories,
    };
    
    if (runType === 'first') {
      useDataStore.getState().setFirstRunResult(result);
      useDataStore.getState().setFirstRunAssets(result.assets);
    } else {
      useDataStore.getState().setSecondRunResult(result);
      useDataStore.getState().setSecondRunAssets(result.assets);
    }
    
    return result;
  },
  
  runFullAnalysis: () => {
    const { firstRunAssets } = useDataStore.getState();
    if (firstRunAssets.length === 0) return;
    
    const result = get().runAnalysis('first', firstRunAssets);
    useUIStore.getState().setActiveRun('first');
    
    return result;
  },
  
  runSecondAnalysis: (secondRunAssets: Asset[]) => {
    const result = get().runAnalysis('second', secondRunAssets);
    useUIStore.getState().setActiveRun('comparison');
    
    return result;
  },
  
  filterAssetsByIndustry: (assets: Asset[], industries: string[]): Asset[] => {
    if (industries.length === 0) return assets;
    return assets.filter(a => industries.includes(a.industry));
  },
  
  filterAssetsByRisk: (assets: Asset[], riskLevel: RiskLevel | 'all'): Asset[] => {
    if (riskLevel === 'all') return assets;
    return assets.filter(a => a.riskLevel === riskLevel);
  },
}));

export const useFilteredAssets = () => {
  const activeRun = useUIStore(s => s.activeRun);
  const result = useDataStore(s => 
    activeRun === 'first' || activeRun === 'comparison' 
      ? s.firstRunResult 
      : s.secondRunResult
  );
  const selectedIndustries = useUIStore(s => s.selectedIndustries);
  const highlightRisk = useUIStore(s => s.highlightRisk);
  const { filterAssetsByIndustry, filterAssetsByRisk } = useAnalysisStore();
  
  if (!result) return [];
  
  let filtered = filterAssetsByIndustry(result.assets, selectedIndustries);
  filtered = filterAssetsByRisk(filtered, highlightRisk);
  
  return filtered;
};
