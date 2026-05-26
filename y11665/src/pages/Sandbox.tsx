import { useState } from 'react';
import Scene from '@/components/sandbox/Scene';
import PipeDetails from '@/components/sandbox/PipeDetails';
import PressureGauge from '@/components/sandbox/PressureGauge';
import AnomalyList from '@/components/sandbox/AnomalyList';
import ValvePanel from '@/components/sandbox/ValvePanel';
import PressureLegend from '@/components/sandbox/PressureLegend';
import { useWaterStore } from '@/store/useWaterStore';
import { Play, Calendar, FileText, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Sandbox() {
  const navigate = useNavigate();
  const { segments, anomalies } = useWaterStore();
  const [activeTab, setActiveTab] = useState<'details' | 'valves' | 'legend'>('details');

  const criticalAnomalies = anomalies.filter(a => a.severity === 'high' && !a.acknowledged);
  const warningAnomalies = anomalies.filter(a => a.severity === 'medium' && !a.acknowledged);

  return (
    <div className="h-screen flex bg-slate-950">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-lg px-4 py-2 backdrop-blur">
            <span className="text-cyan-400 font-semibold text-sm">城市水管压力沙盘</span>
          </div>
          {criticalAnomalies.length > 0 && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2 animate-pulse">
              <span className="text-red-400 text-xs font-semibold">
                {criticalAnomalies.length} 项严重告警
              </span>
            </div>
          )}
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={() => navigate('/playback')}
            className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/50 rounded-lg px-3 py-2 hover:border-cyan-500/50 transition-colors"
          >
            <Play size={14} className="text-cyan-400" />
            <span className="text-slate-300 text-xs">历史回放</span>
          </button>
          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/50 rounded-lg px-3 py-2 hover:border-cyan-500/50 transition-colors"
          >
            <FileText size={14} className="text-cyan-400" />
            <span className="text-slate-300 text-xs">报告导出</span>
          </button>
        </div>

        <div className="h-full">
          <Scene />
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-lg px-4 py-2 backdrop-blur flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-400">正常管段: {segments.filter(s => s.dataQuality === 'good').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-400">边界管段: {segments.filter(s => s.dataQuality === 'boundary').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-slate-400">异常管段: {segments.filter(s => s.dataQuality === 'bad').length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Layers size={12} />
              <span>拖拽旋转 · 滚轮缩放 · 点击选择</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-96 bg-slate-900/80 border-l border-slate-700/50 flex flex-col">
        <div className="flex border-b border-slate-700/50">
          {([
            { key: 'details', label: '管段详情' },
            { key: 'valves', label: '阀门控制' },
            { key: 'legend', label: '图例设置' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'details' && (
            <>
              <PipeDetails />
              <PressureGauge />
            </>
          )}
          {activeTab === 'valves' && (
            <ValvePanel />
          )}
          {activeTab === 'legend' && (
            <PressureLegend />
          )}

          <AnomalyList />
        </div>
      </div>
    </div>
  );
}
