import { useSceneStore } from '@/stores/useSceneStore';
import type { PanelTab } from '@/types';
import { SectionPanel } from './SectionPanel';
import { ViewPanel } from './ViewPanel';
import { ReviewPanel } from './ReviewPanel';
import { RiskComparePanel } from './RiskComparePanel';
import { BoundaryPanel } from './BoundaryPanel';
import {
  Scissors,
  Camera,
  CheckSquare,
  GitCompare,
  AlertOctagon,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

const tabConfig: { key: PanelTab; label: string; icon: typeof Scissors }[] = [
  { key: 'section', label: '剖切查看', icon: Scissors },
  { key: 'view', label: '视角管理', icon: Camera },
  { key: 'review', label: '复核流程', icon: CheckSquare },
  { key: 'risk', label: '风险对比', icon: GitCompare },
  { key: 'boundary', label: '边界案例', icon: AlertOctagon },
];

export function RightPanel() {
  const activeTab = useSceneStore((s) => s.activeTab);
  const setActiveTab = useSceneStore((s) => s.setActiveTab);
  const collapsed = useSceneStore((s) => s.panelCollapsed);
  const togglePanel = useSceneStore((s) => s.togglePanel);

  return (
    <div
      className={`relative flex h-full flex-col border-l border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-[420px]'
      }`}
    >
      {/* 折叠按钮 */}
      <button
        onClick={togglePanel}
        className="absolute -left-4 top-6 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/40 bg-slate-900 text-cyan-400 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-500/20"
      >
        {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {collapsed ? (
        // 折叠态：图标栏
        <div className="flex flex-col items-center gap-3 pt-16">
          {tabConfig.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  useSceneStore.getState().setPanelCollapsed(false);
                }}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20'
                    : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      ) : (
        // 展开态
        <>
          {/* Tab栏 */}
          <div className="flex shrink-0 border-b border-cyan-500/15 bg-slate-900/50">
            {tabConfig.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`relative flex flex-1 flex-col items-center gap-1 px-2 py-3 text-[11px] font-medium transition-all ${
                    isActive
                      ? 'text-cyan-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{t.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 面板内容区 */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'section' && <SectionPanel />}
            {activeTab === 'view' && <ViewPanel />}
            {activeTab === 'review' && <ReviewPanel />}
            {activeTab === 'risk' && <RiskComparePanel />}
            {activeTab === 'boundary' && <BoundaryPanel />}
          </div>
        </>
      )}
    </div>
  );
}
