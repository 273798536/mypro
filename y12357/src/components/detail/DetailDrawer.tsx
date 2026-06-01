import { useState } from 'react';
import { X, Link2, Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TraceabilityPanel } from './TraceabilityPanel';
import { BatchComparison } from './BatchComparison';

type TabType = 'traceability' | 'comparison';

export function DetailDrawer() {
  const { showDetailPanel, setShowDetailPanel } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('traceability');
  
  if (!showDetailPanel) return null;
  
  return (
    <div className="fixed inset-y-0 right-0 w-4/5 bg-industrial-900 border-l border-industrial-700 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between p-3 border-b border-industrial-700 bg-industrial-850">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('traceability')}
            className={`px-4 py-2 text-sm font-mono rounded-sm flex items-center gap-1.5 transition-colors ${
              activeTab === 'traceability'
                ? 'bg-tech-500 text-white'
                : 'text-industrial-400 hover:text-industrial-200 hover:bg-industrial-800'
            }`}
          >
            <Link2 size={14} />
            数据追溯
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 text-sm font-mono rounded-sm flex items-center gap-1.5 transition-colors ${
              activeTab === 'comparison'
                ? 'bg-tech-500 text-white'
                : 'text-industrial-400 hover:text-industrial-200 hover:bg-industrial-800'
            }`}
          >
            <Layers size={14} />
            批次对比
          </button>
        </div>
        
        <button
          onClick={() => setShowDetailPanel(false)}
          className="p-2 text-industrial-400 hover:text-industrial-200 hover:bg-industrial-700 rounded-sm transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {activeTab === 'traceability' && <TraceabilityPanel />}
        {activeTab === 'comparison' && <BatchComparison />}
      </div>
    </div>
  );
}
