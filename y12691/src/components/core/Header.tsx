import { Snowflake, Box, Layers, History, FileQuestion, GitCompare } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function Header() {
  const { activeTab, setActiveTab } = useAppStore();

  const tabs = [
    { id: '3d' as const, label: '3D视图', icon: Box },
    { id: 'slices' as const, label: '切片列表', icon: Layers },
    { id: 'audit' as const, label: '审计记录', icon: History },
    { id: 'sync' as const, label: '同步检测', icon: FileQuestion },
    { id: 'conclusion' as const, label: '结论对比', icon: GitCompare },
  ];

  return (
    <header className="glass-card border-b border-ice-blue/20">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ice-blue to-info flex items-center justify-center">
            <Snowflake size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gradient leading-tight">
              海冰厚度立体切片
            </h1>
            <p className="text-xs text-text-muted">北极科考站 A3 区域 · 2026年6月第1周</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-ice-blue/20 text-ice-blue border border-ice-blue/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-thin">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-ice-blue/20 text-ice-blue border border-ice-blue/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
