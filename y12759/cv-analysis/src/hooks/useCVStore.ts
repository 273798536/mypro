import { useState, useCallback, useMemo } from 'react';
import { DataSource, CVExperiment, TemperaturePoint } from '../types';
import { mockDataSource } from '../data/mockData';
import { runAllChecks, updateRetestSuggestionAfterTemperature } from '../utils/detector';
import { parseFile } from '../utils/parser';

export function useCVStore() {
  const [dataSource, setDataSource] = useState<DataSource>(() => runAllChecks(mockDataSource));

  const importFile = useCallback(async (file: File) => {
    const parsed = await parseFile(file);
    const checked = runAllChecks(parsed);
    setDataSource({ ...checked, sourceFileName: file.name });
  }, []);

  const loadDemoData = useCallback(() => {
    const checked = runAllChecks({ experiments: mockDataSource.experiments, reagents: mockDataSource.reagents });
    setDataSource({ ...checked, sourceFileName: 'demo_data.xlsx' });
  }, []);

  const patchExperiment = useCallback((experimentId: string, patch: Partial<CVExperiment>) => {
    setDataSource(prev => {
      const experiments = prev.experiments.map(e => e.experimentId === experimentId ? { ...e, ...patch } : e);
      const checked = runAllChecks({ experiments, reagents: prev.reagents });
      return { ...checked, sourceFileName: prev.sourceFileName };
    });
  }, []);

  const appendTemperaturePoint = useCallback((experimentId: string, point: TemperaturePoint) => {
    setDataSource(prev => {
      const experiments = prev.experiments.map(e => {
        if (e.experimentId !== experimentId) return e;
        const existing = e.temperaturePoints || [];
        return { ...e, temperaturePoints: [...existing, point] };
      });
      const checked = runAllChecks({ experiments, reagents: prev.reagents });
      const batches = checked.batches.map(b => updateRetestSuggestionAfterTemperature(b, experiments));
      return { ...checked, batches, sourceFileName: prev.sourceFileName };
    });
  }, []);

  const resolveIssue = useCallback((issueId: string, note?: string) => {
    setDataSource(prev => {
      const issues = prev.issues.map(i => i.issueId === issueId ? { ...i, resolved: true, resolvedAt: new Date().toISOString(), resolvedNote: note } : i);
      const batches = prev.batches.map(b => ({
        ...b,
        issues: b.issues.map(i => i.issueId === issueId ? { ...i, resolved: true, resolvedAt: new Date().toISOString(), resolvedNote: note } : i),
      }));
      return { ...prev, issues, batches };
    });
  }, []);

  const stats = useMemo(() => {
    const totalExperiments = dataSource.experiments.length;
    const totalBatches = dataSource.batches.length;
    const totalIssues = dataSource.issues.length;
    const criticalIssues = dataSource.issues.filter(i => i.severity === 'critical' && !i.resolved).length;
    const warningIssues = dataSource.issues.filter(i => i.severity === 'warning' && !i.resolved).length;
    const blockedBatches = dataSource.batches.filter(b => b.status === 'blocked').length;
    const warningBatches = dataSource.batches.filter(b => b.status === 'warning').length;
    const blankMissing = dataSource.issues.filter(i => i.type === 'blank_control_missing' && !i.resolved).length;
    const invalidReagents = dataSource.reagents.filter(r => r.status !== 'valid').length;
    return {
      totalExperiments, totalBatches, totalIssues, criticalIssues, warningIssues,
      blockedBatches, warningBatches, blankMissing, invalidReagents,
    };
  }, [dataSource]);

  return {
    dataSource, stats, importFile, loadDemoData, patchExperiment,
    appendTemperaturePoint, resolveIssue,
  };
}
