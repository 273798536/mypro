import CorridorPanel from '@/components/panels/CorridorPanel';
import ComparePanel from '@/components/panels/ComparePanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`flex flex-col h-full bg-slate-900/90 backdrop-blur-sm border-r border-slate-700 transition-all duration-300 ${
      collapsed ? 'w-12' : 'w-72'
    }`}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {!collapsed && (
          <>
            <CorridorPanel />
            <ComparePanel />
          </>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 border-t border-slate-700 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
}
