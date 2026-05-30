import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Scene3D } from './scene/Scene';
import { Toolbar } from './components/Toolbar';
import { ShadowPlayer } from './components/ShadowPlayer';
import { EnergyPanel } from './components/EnergyPanel';
import { DataTable } from './components/DataTable';
import { useAppStore } from './store/useAppStore';
import { mockRoof, mockPanels, mockObstacles, loadObstaclesAsync } from './data/mockData';
import { processPanels } from './data/dataProcessor';
import type { CameraView, ShadowSeverity } from './data/types';
import { AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([12, 10, 12]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const [restoreView, setRestoreView] = useState<CameraView | null>(null);
  const [showRoofNotes, setShowRoofNotes] = useState(false);
  const [hoveredPanelInfo, setHoveredPanelInfo] = useState<string | null>(null);

  const setRoof = useAppStore((s) => s.setRoof);
  const setPanels = useAppStore((s) => s.setPanels);
  const setObstacles = useAppStore((s) => s.setObstacles);
  const setObstaclesLoading = useAppStore((s) => s.setObstaclesLoading);
  const roof = useAppStore((s) => s.roof);
  const panels = useAppStore((s) => s.panels);
  const obstacles = useAppStore((s) => s.obstacles);
  const obstaclesLoading = useAppStore((s) => s.obstaclesLoading);
  const diagnosticResult = useAppStore((s) => s.diagnosticResult);
  const getFilteredPanels = useAppStore((s) => s.getFilteredPanels);
  const hoveredPanelId = useAppStore((s) => s.hoveredPanelId);
  const filters = useAppStore((s) => s.filters);

  useEffect(() => {
    setRoof(mockRoof);
    const processed = processPanels(mockPanels);
    setPanels(processed);
    setObstacles(mockObstacles);
    setObstaclesLoading(true);

    loadObstaclesAsync().then((loaded) => {
      setObstacles(loaded);
      setObstaclesLoading(false);
    });
  }, [setRoof, setPanels, setObstacles, setObstaclesLoading]);

  const diagnosticMap = useMemo(() => {
    const map = new Map<string, { severity: ShadowSeverity; hasAzimuth: boolean; hasSeason: boolean }>();

    if (!diagnosticResult) return map;

    panels.forEach((panel) => {
      const panelRecords = diagnosticResult.shadowRecords.filter((r) => r.panelId === panel.id);
      const maxSeverity = panelRecords.reduce((max, r) => {
        const order = ['none', 'low', 'medium', 'high', 'critical'];
        return order.indexOf(r.severity) > order.indexOf(max) ? r.severity : max;
      }, 'none' as ShadowSeverity);

      const hasAzimuth = diagnosticResult.azimuthErrors.some((e) => e.panelId === panel.id);
      const hasSeason = diagnosticResult.seasonMisses.some((m) => m.panelId === panel.id);

      map.set(panel.id, { severity: maxSeverity, hasAzimuth, hasSeason });
    });

    return map;
  }, [diagnosticResult, panels]);

  const highlightedPanelIds = useMemo(() => {
    if (!diagnosticResult) return new Set<string>();
    const filtered = getFilteredPanels();
    return new Set(filtered.map((p) => p.id));
  }, [diagnosticResult, getFilteredPanels]);

  useEffect(() => {
    if (hoveredPanelId) {
      const panel = panels.find((p) => p.id === hoveredPanelId);
      if (panel) {
        let info = `${panel.id} | ${panel.model} | ${(panel.efficiency * 100).toFixed(0)}%`;
        if (panel.notes) info += ` | 备注: ${panel.notes}`;
        if (panel.isMissingFields) info += ' | ⚠️ 缺字段';
        setHoveredPanelInfo(info);
      }
    } else {
      setHoveredPanelInfo(null);
    }
  }, [hoveredPanelId, panels]);

  const handleCameraChange = (pos: [number, number, number], target: [number, number, number]) => {
    setCameraPosition(pos);
    setCameraTarget(target);
  };

  const handleRestoreView = (view: CameraView) => {
    setRestoreView(view);
    setTimeout(() => setRestoreView(null), 1000);
  };

  const filteredPanels = useMemo(() => {
    if (filters.panelId === 'all' && highlightedPanelIds.size === 0) return panels;
    if (highlightedPanelIds.size > 0) {
      return panels.filter((p) => highlightedPanelIds.has(p.id));
    }
    return panels;
  }, [panels, filters.panelId, highlightedPanelIds]);

  if (!roof) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col overflow-hidden font-sans">
      <Toolbar
        currentCameraPosition={cameraPosition}
        currentCameraTarget={cameraTarget}
        onRestoreView={handleRestoreView}
      />

      <div className="flex-1 flex overflow-hidden">
        <ShadowPlayer />

        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <Scene3D
              roof={roof}
              panels={filteredPanels}
              obstacles={obstacles}
              diagnosticMap={diagnosticMap}
              highlightedPanelIds={highlightedPanelIds}
              onCameraChange={handleCameraChange}
              restoreView={restoreView}
            />

            {obstaclesLoading && (
              <div className="absolute top-4 left-4 bg-orange-900/80 border border-orange-700 px-3 py-2 text-xs text-orange-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                障碍物数据加载中... (2.5秒)
              </div>
            )}

            {roof.notes && (
              <button
                onClick={() => setShowRoofNotes(!showRoofNotes)}
                className="absolute top-4 right-4 bg-yellow-900/80 border border-yellow-700 px-3 py-2 text-xs text-yellow-200 flex items-center gap-2 hover:bg-yellow-900 transition-colors"
              >
                <Info className="w-4 h-4" />
                屋顶备注
              </button>
            )}

            {showRoofNotes && roof.notes && (
              <div className="absolute top-14 right-4 bg-slate-800 border border-slate-600 p-3 max-w-sm text-xs text-slate-300 shadow-xl z-20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 font-semibold">屋顶备注</span>
                  <button
                    onClick={() => setShowRoofNotes(false)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-400 leading-relaxed">{roof.notes}</p>
              </div>
            )}

            {hoveredPanelInfo && (
              <div className="absolute bottom-4 left-4 bg-slate-800/95 border border-slate-600 px-3 py-1.5 text-[11px] text-slate-300 font-mono">
                {hoveredPanelInfo}
              </div>
            )}

            <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-700 px-3 py-1.5 text-[10px] text-slate-500 font-mono">
              相机: ({cameraPosition[0].toFixed(1)}, {cameraPosition[1].toFixed(1)}, {cameraPosition[2].toFixed(1)})
            </div>
          </div>

          <DataTable />
        </div>

        <EnergyPanel />
      </div>
    </div>
  );
}
