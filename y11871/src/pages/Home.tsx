import { useEffect, useState } from 'react';
import { Building, PanelRightClose, PanelRightOpen, ChevronUp, ChevronDown, Activity } from 'lucide-react';
import { ParkingBuilding3D } from '../components/3d/ParkingBuilding';
import { TimelinePlayer } from '../components/timeline/TimelinePlayer';
import { FloorHeatmap } from '../components/heatmap/FloorHeatmap';
import { EntranceHeatmap } from '../components/heatmap/EntranceHeatmap';
import { ExplanationPanel } from '../components/analysis/ExplanationPanel';
import { DataQualityPanel } from '../components/data/DataQualityPanel';
import { ScenarioSelector } from '../components/sidebar/ScenarioSelector';
import { FilterToolbar } from '../components/FilterToolbar';
import { useParkingStore } from '../store/useParkingStore';
import { useParkingData } from '../hooks/useParkingData';
import { getDemoScenarios, generateSmoothScenario, generateBlockedEntranceScenario } from '../data/scenarios';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export default function Home() {
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [bottomPanelExpanded, setBottomPanelExpanded] = useState(false);
  const { loadScenario, currentRecord, isLoading } = useParkingStore();
  const { currentScenario, peakPressure, peakHour, dataQuality } = useParkingData();

  useEffect(() => {
    const scenarios = getDemoScenarios();
    if (scenarios.length > 0) {
      loadScenario(scenarios[0]);
    }
  }, [loadScenario]);

  const handleLoadSmooth = () => {
    loadScenario(generateSmoothScenario());
  };

  const handleLoadBlocked = () => {
    loadScenario(generateBlockedEntranceScenario());
  };

  return (
    <div className="w-full h-full flex flex-col bg-parking-bg overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 bg-parking-panel border-b border-parking-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
            <Building size={24} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-gradient">
              城市停车需求立方
            </h1>
            <p className="text-xs text-slate-500">
              商圈停车多维压力分析 · 可解释性预测平台
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-lg border border-parking-border">
            <Activity size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">
              {currentRecord ? `实时更新中 · ${currentRecord.timestamp.split('T')[0]}` : '等待数据加载...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">
              演示版
            </Badge>
          </div>
        </div>
      </header>

      <FilterToolbar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <ParkingBuilding3D />

            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              <Card className="w-64">
                <Card.Content className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">当前场景</span>
                    <Badge variant={currentScenario?.type === 'smooth' ? 'success' : currentScenario?.type === 'blocked' ? 'danger' : 'warning'}>
                      {currentScenario?.name || '未加载'}
                    </Badge>
                  </div>
                  {currentScenario && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {currentScenario.description}
                    </p>
                  )}
                </Card.Content>
              </Card>

              {peakPressure > 0 && (
                <Card className="w-64">
                  <Card.Content className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">今日峰值</span>
                      <span className="text-xs text-cyan-400 font-mono">
                        {Math.round(peakPressure * 100)}% · {Math.floor(peakHour).toString().padStart(2, '0')}:00
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${peakPressure * 100}%`,
                          backgroundColor: peakPressure > 0.7 ? '#ef4444' : peakPressure > 0.5 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                  </Card.Content>
                </Card>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="success"
                  onClick={handleLoadSmooth}
                  className="flex-1"
                >
                  顺利样例
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleLoadBlocked}
                  className="flex-1"
                >
                  入口回堵
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-parking-bg/80 backdrop-blur-sm z-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-cyan-300 font-display">正在加载停车数据...</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-parking-border">
            <button
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-800/30 transition-colors"
              onClick={() => setBottomPanelExpanded(!bottomPanelExpanded)}
            >
              <span className="flex items-center gap-2">
                {bottomPanelExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                数据质量报告
                {dataQuality && (
                  <Badge size="sm" variant={dataQuality.avgQuality >= 0.9 ? 'success' : 'warning'}>
                    {Math.round(dataQuality.avgQuality * 100)}% 完整
                  </Badge>
                )}
              </span>
            </button>
            
            {bottomPanelExpanded && (
              <div className="max-h-64 overflow-y-auto p-4 pt-0">
                <DataQualityPanel />
              </div>
            )}
          </div>
        </div>

        <div 
          className={`transition-all duration-300 border-l border-parking-border bg-parking-panel overflow-hidden flex flex-col ${
            rightPanelCollapsed ? 'w-0' : 'w-[420px]'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-parking-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-cyan-300 font-display">
                分析面板
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanelCollapsed(true)}
              className="w-8 h-8"
            >
              <PanelRightClose size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <ExplanationPanel />
            <FloorHeatmap />
            <EntranceHeatmap />
            <ScenarioSelector />
          </div>
        </div>

        {rightPanelCollapsed && (
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-parking-panel border border-parking-border border-r-0 rounded-l-lg p-2 hover:bg-slate-800/50 transition-colors z-20"
            onClick={() => setRightPanelCollapsed(false)}
          >
            <PanelRightOpen size={16} className="text-cyan-400" />
          </button>
        )}
      </div>

      <TimelinePlayer />
    </div>
  );
}
