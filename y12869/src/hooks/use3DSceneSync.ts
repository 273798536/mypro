import { useAppStore } from '@/store/useAppStore';
import { useEffect, useMemo } from 'react';

export function use3DSceneSync() {
  const initialize = useAppStore(s => s.initialize);
  const loading = useAppStore(s => s.loading);
  const report = useAppStore(s => s.report);
  const selection = useAppStore(s => s.scene.selection);
  const clipping = useAppStore(s => s.scene.clipping);
  const setSelectedSections = useAppStore(s => s.setSelectedSections);
  const setSelectedLines = useAppStore(s => s.setSelectedLines);
  const setSelectedPoint = useAppStore(s => s.setSelectedPoint);
  const setClipping = useAppStore(s => s.setClipping);
  const getAllPoints = useAppStore(s => s.getAllPoints);
  const getFilteredPoints = useAppStore(s => s.getFilteredPoints);

  useEffect(() => { initialize(); }, [initialize]);

  const filteredPoints = useMemo(() => getFilteredPoints(), [selection, report, getFilteredPoints]);
  const allPoints = useMemo(() => getAllPoints(), [report, getAllPoints]);

  const anomalyPoints = useMemo(
    () => filteredPoints.filter(p => p.isAnomaly),
    [filteredPoints]
  );

  return {
    loading,
    report,
    selection,
    clipping,
    filteredPoints,
    allPoints,
    anomalyPoints,
    setSelectedSections,
    setSelectedLines,
    setSelectedPoint,
    setClipping,
  };
}
