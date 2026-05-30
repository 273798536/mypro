import DetailTable from '@/components/panels/DetailTable';
import ConflictPanel from '@/components/panels/ConflictPanel';
import { ChevronRight, ChevronLeft, Building2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

type TabType = 'details' | 'conflicts';

export default function RightSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-slate-900/90 backdrop-blur-sm border-l border-slate-700 flex flex-col">
        <button
          onClick={() => setActiveTab('details')}
          className={`h-14 flex flex-col items-center justify-center gap-0.5 transition-colors border-b border-slate-700 ${
            activeTab === 'details'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          title="建筑明细"
        >
          <Building2 size={18} />
          <span className="text-[10px]">明细</span>
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`h-14 flex flex-col items-center justify-center gap-0.5 transition-colors border-b border-slate-700 ${
            activeTab === 'conflicts'
              ? 'bg-red-500/20 text-red-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          title="冲突列表"
        >
          <AlertTriangle size={18} />
          <span className="text-[10px]">冲突</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setCollapsed(false)}
          className="h-10 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-t border-slate-700"
          title="展开侧边栏"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-slate-900/90 backdrop-blur-sm border-l border-slate-700 flex flex-col">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 px-4 py-3 text-sm flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'details'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Building2 size={16} />
          建筑明细
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`flex-1 px-4 py-3 text-sm flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'conflicts'
              ? 'text-red-400 border-b-2 border-red-400 bg-red-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <AlertTriangle size={16} />
          冲突列表
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'details' ? <DetailTable /> : <ConflictPanel />}
      </div>

      <button
        onClick={() => setCollapsed(true)}
        className="h-10 border-t border-slate-700 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title="收起侧边栏"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
