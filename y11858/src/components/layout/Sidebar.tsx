import { useState } from 'react';
import { QuantumNumberPanel } from '../controls/QuantumNumberPanel';
import { VisualizationPanel } from '../controls/VisualizationPanel';
import { SlicePanel } from '../controls/SlicePanel';
import { ResultPanel } from '../analysis/ResultPanel';
import { ColorScaleBar } from '../analysis/ColorScaleBar';
import { RunHistory } from '../analysis/RunHistory';
import { ChevronDown, ChevronUp, Settings, FlaskConical } from 'lucide-react';

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-slate-300">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>
      {open && (
        <div className="px-3 py-3 bg-slate-900/40">
          {children}
        </div>
      )}
    </div>
  );
}

export function LeftSidebar() {
  return (
    <div className="w-72 h-full overflow-y-auto p-3 space-y-3 scrollbar-thin bg-slate-950/80 backdrop-blur-sm border-r border-slate-800/50">
      <CollapsibleSection
        title="量子数 & 预设"
        icon={<Settings className="w-3.5 h-3.5 text-cyan-400" />}
        defaultOpen
      >
        <QuantumNumberPanel />
      </CollapsibleSection>

      <CollapsibleSection
        title="可视化设置"
        icon={<Settings className="w-3.5 h-3.5 text-purple-400" />}
        defaultOpen
      >
        <VisualizationPanel />
      </CollapsibleSection>

      <CollapsibleSection
        title="切片控制"
        icon={<Settings className="w-3.5 h-3.5 text-amber-400" />}
        defaultOpen={false}
      >
        <SlicePanel />
      </CollapsibleSection>
    </div>
  );
}

export function RightSidebar() {
  return (
    <div className="w-72 h-full overflow-y-auto p-3 space-y-3 scrollbar-thin bg-slate-950/80 backdrop-blur-sm border-l border-slate-800/50">
      <CollapsibleSection
        title="结果分析"
        icon={<FlaskConical className="w-3.5 h-3.5 text-green-400" />}
        defaultOpen
      >
        <ResultPanel />
      </CollapsibleSection>

      <CollapsibleSection
        title="颜色标尺"
        icon={<FlaskConical className="w-3.5 h-3.5 text-amber-400" />}
        defaultOpen
      >
        <ColorScaleBar />
      </CollapsibleSection>

      <CollapsibleSection
        title="运行历史"
        icon={<FlaskConical className="w-3.5 h-3.5 text-slate-400" />}
        defaultOpen={false}
      >
        <RunHistory />
      </CollapsibleSection>
    </div>
  );
}
