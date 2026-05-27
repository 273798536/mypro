import SimulationCanvas from '../components/SimulationCanvas';
import ParameterPanel from '../components/ParameterPanel';
import StabilityPanel from '../components/StabilityPanel';
import TimelineControl from '../components/TimelineControl';
import DetailPanel from '../components/DetailPanel';
import PresetPanel from '../components/PresetPanel';
import CorrectionLogs from '../components/CorrectionLogs';
import ReportPanel from '../components/ReportPanel';
import { useState } from 'react';
import { Gauge, Folder, History, FileText } from 'lucide-react';

type TabType = 'stability' | 'presets' | 'history' | 'report';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('stability');

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-base font-semibold text-slate-100">
          热传导板温度模拟
        </h1>
        <span className="ml-2 text-xs text-slate-500">
          有限差分法 · 显式欧拉格式
        </span>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ParameterPanel />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <SimulationCanvas />
          </div>
          <TimelineControl />
        </div>

        <div className="w-64 flex flex-col bg-slate-900 border-l border-slate-700 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <DetailPanel />
          </div>
        </div>
      </div>

      <div className="h-72 bg-slate-900 border-t border-slate-700 flex overflow-hidden">
        <div className="w-32 border-r border-slate-700 flex flex-col">
          <button
            onClick={() => setActiveTab('stability')}
            className={`flex items-center gap-2 px-3 py-3 text-left transition-colors ${
              activeTab === 'stability'
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Gauge size={16} />
            <span className="text-xs">稳定性</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-3 py-3 text-left transition-colors ${
              activeTab === 'presets'
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Folder size={16} />
            <span className="text-xs">预设</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3 py-3 text-left transition-colors ${
              activeTab === 'history'
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <History size={16} />
            <span className="text-xs">痕迹</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-3 py-3 text-left transition-colors ${
              activeTab === 'report'
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <FileText size={16} />
            <span className="text-xs">报告</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'stability' && <StabilityPanel />}
          {activeTab === 'presets' && <PresetPanel />}
          {activeTab === 'history' && <CorrectionLogs />}
          {activeTab === 'report' && <ReportPanel />}
        </div>
      </div>
    </div>
  );
}
