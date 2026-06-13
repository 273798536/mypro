import { useState } from 'react';
import { ChevronRight, Layers, FileCode, GitBranch, MessageSquare } from 'lucide-react';
import FormulaCard from '@/components/FormulaCard/FormulaCard';
import NoteTimeline from '@/components/NoteTimeline/NoteTimeline';
import SourceTracker from '@/components/SourceTracker/SourceTracker';
import { useDataStore } from '@/store/useDataStore';
import { anomalyTypeLabels, anomalyStatusLabels, anomalyTypeColors } from '@/utils/anomaly';
import { dataStatusLabels, dataStatusColors } from '@/utils/anomaly';
import { formatTimestamp, formatErrorValue } from '@/utils/format';

type TabType = 'formula' | 'notes' | 'source';

export default function DetailPanel() {
  const { getSelectedData, getSelectedAnomaly, updateAnomalyStatus } = useDataStore();
  const [activeTab, setActiveTab] = useState<TabType>('formula');
  const [collapsed, setCollapsed] = useState(false);

  const selectedData = getSelectedData();
  const selectedAnomaly = getSelectedAnomaly();

  const tabs: { id: TabType; label: string; icon: typeof Layers }[] = [
    { id: 'formula', label: '归因公式', icon: FileCode },
    { id: 'notes', label: '维修备注', icon: MessageSquare },
    { id: 'source', label: '来源追踪', icon: GitBranch },
  ];

  const handleStatusChange = (newStatus: 'pending' | 'reviewed' | 'resolved') => {
    if (selectedAnomaly) {
      updateAnomalyStatus(selectedAnomaly.id, newStatus);
    }
  };

  if (collapsed) {
    return (
      <div className="h-full w-12 bg-slate-900/80 border-l border-slate-700/50 flex flex-col items-center py-4 gap-4">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCollapsed(false);
              }}
              className={`p-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-glow/20 text-cyan-glow'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-full w-96 bg-slate-900/80 backdrop-blur-sm border-l border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">详情面板</h3>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {selectedData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">{selectedData.id}</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${dataStatusColors[selectedData.status]}20`,
                  color: dataStatusColors[selectedData.status],
                }}
              >
                {dataStatusLabels[selectedData.status]}
              </span>
            </div>
            <div className="text-sm text-white">{formatTimestamp(selectedData.timestamp)}</div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/40 rounded-lg p-2 text-center">
                <div className="text-xs text-slate-500">波高</div>
                <div className="text-cyan-glow font-mono text-sm">{selectedData.waveHeight.toFixed(2)}m</div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-2 text-center">
                <div className="text-xs text-slate-500">周期</div>
                <div className="text-white font-mono text-sm">{selectedData.wavePeriod.toFixed(1)}s</div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-2 text-center">
                <div className="text-xs text-slate-500">误差</div>
                <div
                  className={`font-mono text-sm ${
                    Math.abs(selectedData.errorValue) > 0.5 ? 'text-warning-orange' : 'text-white'
                  }`}
                >
                  {formatErrorValue(selectedData.errorValue)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>来源: {selectedData.source}</span>
              <span>版本: {selectedData.attribution}</span>
            </div>

            {selectedAnomaly && (
              <div className="pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${anomalyTypeColors[selectedAnomaly.type]}20`,
                      color: anomalyTypeColors[selectedAnomaly.type],
                    }}
                  >
                    {anomalyTypeLabels[selectedAnomaly.type]}
                    {selectedAnomaly.isSuspectedNoise && ' · 疑似噪声'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-2">{selectedAnomaly.description}</p>
                <p className="text-xs text-slate-500 mb-3">归因: {selectedAnomaly.attribution}</p>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">处理状态:</span>
                  <div className="flex gap-1">
                    {(['pending', 'reviewed', 'resolved'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          selectedAnomaly.status === status
                            ? status === 'pending'
                              ? 'bg-warning-orange text-white'
                              : status === 'reviewed'
                              ? 'bg-cyan-glow text-deep-ocean'
                              : 'bg-success-green text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {anomalyStatusLabels[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-sm">
            请选择数据点查看详情
          </div>
        )}
      </div>

      <div className="flex border-b border-slate-700/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                isActive
                  ? 'text-cyan-glow border-b-2 border-cyan-glow bg-cyan-glow/5'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {activeTab === 'formula' && <FormulaCard />}
        {activeTab === 'notes' && <NoteTimeline />}
        {activeTab === 'source' && <SourceTracker />}
      </div>
    </div>
  );
}

function ChevronLeft(props: { className?: string }) {
  return (
    <svg
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
