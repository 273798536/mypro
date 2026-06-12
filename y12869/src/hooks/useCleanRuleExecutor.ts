import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { MeasurePoint } from '@/types';

export function useCleanRuleExecutor() {
  const ruleChain = useAppStore(s => s.cleaning.ruleChain);
  const snapshots = useAppStore(s => s.cleaning.snapshots);
  const currentSnapshotIndex = useAppStore(s => s.cleaning.currentSnapshotIndex);
  const toggleRule = useAppStore(s => s.toggleRule);
  const updateRuleParam = useAppStore(s => s.updateRuleParam);
  const setCurrentSnapshotIndex = useAppStore(s => s.setCurrentSnapshotIndex);
  const addInspectionPhoto = useAppStore(s => s.addInspectionPhoto);
  const getAllPoints = useAppStore(s => s.getAllPoints);

  const currentSnapshot = snapshots[currentSnapshotIndex] || null;

  const applyChain = (points: MeasurePoint[]): MeasurePoint[] => {
    let result = points.map(p => ({ ...p }));
    for (const rule of ruleChain.rules) {
      if (!rule.enabled) continue;
      if (rule.type === 'outlier') {
        const sigma = rule.params.sigma || 3;
        const win = rule.params.windowSize || 11;
        result = result.map((p, i, arr) => {
          const start = Math.max(0, i - Math.floor(win / 2));
          const end = Math.min(arr.length, i + Math.ceil(win / 2));
          const seg = arr.slice(start, end).map(x => x.correctedDepth);
          const mean = seg.reduce((s, v) => s + v, 0) / seg.length;
          const variance = seg.reduce((s, v) => s + (v - mean) ** 2, 0) / seg.length;
          const std = Math.sqrt(variance);
          const cond = Math.abs(p.correctedDepth - mean) > sigma * std;
          if (cond) return { ...p, correctedDepth: mean, flags: [...p.flags, 'outlier_fixed'] };
          return p;
        });
      } else if (rule.type === 'movingAvg') {
        const win = rule.params.windowSize || 5;
        result = result.map((p, i, arr) => {
          const start = Math.max(0, i - Math.floor(win / 2));
          const end = Math.min(arr.length, i + Math.ceil(win / 2));
          const seg = arr.slice(start, end).map(x => x.correctedDepth);
          const mean = seg.reduce((s, v) => s + v, 0) / seg.length;
          return { ...p, correctedDepth: +mean.toFixed(3) };
        });
      } else if (rule.type === 'kalman') {
        const Q = rule.params.processNoise || 0.01;
        const R = rule.params.measureNoise || 0.05;
        let x = result[0]?.correctedDepth || 0;
        let P = 1;
        result = result.map(p => {
          P = P + Q;
          const K = P / (P + R);
          x = x + K * (p.correctedDepth - x);
          P = (1 - K) * P;
          return { ...p, correctedDepth: +x.toFixed(3) };
        });
      } else if (rule.type === 'manualReview') {
        const maxDrift = rule.params.maxDriftMeters || 24;
        result = result.map(p => {
          if (p.anomalyType === 'trajectory_drift') {
            return { ...p, correctedDepth: +(p.correctedDepth * 0.995).toFixed(3), flags: [...p.flags, 'drift_fixed'] };
          }
          void maxDrift;
          return p;
        });
      }
    }
    return result;
  };

  const lineGroups = useMemo(() => {
    const map = new Map<string, MeasurePoint[]>();
    getAllPoints().forEach(p => {
      const lineId = p.pointId.split('-').slice(0, 3).join('-');
      if (!map.has(lineId)) map.set(lineId, []);
      map.get(lineId)!.push(p);
    });
    return map;
  }, [getAllPoints]);

  return {
    ruleChain,
    snapshots,
    currentSnapshotIndex,
    currentSnapshot,
    toggleRule,
    updateRuleParam,
    setCurrentSnapshotIndex,
    addInspectionPhoto,
    applyChain,
    lineGroups,
  };
}
