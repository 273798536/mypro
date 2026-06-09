import { NavLink, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Table,
  GitCompare,
  AlertTriangle,
  FlaskConical,
  Download,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

const navItems = [
  { to: '/dashboard', label: '排期仪表板', icon: LayoutDashboard },
  { to: '/data', label: '数据导入与编辑', icon: Table },
  { to: '/review', label: '误差分析与复核', icon: GitCompare },
  { to: '/issues', label: '缺口与异常报告', icon: AlertTriangle },
];

export default function Layout() {
  const location = useLocation();
  const { loadMockData, questions, runCalculation, schedules, stats } = useAppStore();

  useEffect(() => {
    if (questions.length === 0) {
      loadMockData();
    }
  }, [questions.length, loadMockData]);

  const handleExport = () => {
    if (schedules.length === 0) runCalculation();
    const exportData = useAppStore.getState();
    const json = JSON.stringify(
      {
        questions: exportData.questions,
        schedules: exportData.schedules,
        gaps: exportData.gaps,
        config: exportData.config,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topo-schedule-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentTitle = navItems.find((n) => n.to === location.pathname)?.label || '拓扑排序发布排期';

  return (
    <div className="flex min-h-screen text-gray-100">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[#1e3a5f] bg-[#0a1828]">
        <div className="flex items-center gap-2 border-b border-[#1e3a5f] px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#d4a24c] to-[#8b6a2d] text-[#0a1828] shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif-display text-sm font-bold leading-tight text-white">拓扑排期</div>
            <div className="text-[10px] text-gray-500">Topo Schedule · v1.0</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all ${
                    isActive
                      ? 'bg-[#1e3a5f] text-[#d4a24c] shadow-inner'
                      : 'text-gray-400 hover:bg-[#14273d] hover:text-gray-200'
                  }`
                }
              >
                <Icon className={`h-4 w-4 transition-colors ${location.pathname === item.to ? 'text-[#d4a24c]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#1e3a5f] space-y-2 p-3">
          <div className="rounded-md border border-[#2a4a73] bg-[#0f2138] p-3 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-gray-400">数据统计</span>
              <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#8ab8e0]">
                {stats.total}题
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">已处理</span>
                <span className="font-mono text-[#2d936c]">{stats.processed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">已跳过</span>
                <span className="font-mono text-[#c85353]">{stats.skipped}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#2a4a73] bg-[#1e3a5f] px-3 py-2 text-xs text-gray-200 transition-all hover:border-[#d4a24c] hover:text-[#d4a24c]"
          >
            <Download className="h-3.5 w-3.5" />
            导出排期结果
          </button>
          <button
            onClick={() => {
              if (confirm('确定要重置所有数据吗？此操作不可恢复。')) {
                useAppStore.getState().resetAll();
                loadMockData();
              }
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#3a2a2a] bg-[#2a1414] px-3 py-2 text-xs text-[#e99090] transition-all hover:border-[#c85353]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置示例数据
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#1e3a5f] bg-[#0a1828]/60 px-6 py-3 backdrop-blur-sm">
          <div>
            <h1 className="font-serif-display text-xl font-semibold text-white">{currentTitle}</h1>
            <p className="text-xs text-gray-500">
              拓扑排序算法 · 公式透明 · 容错计算 · 支持批量复核
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-[#2a4a73] bg-[#0f2138] px-3 py-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-[#d4a24c]" />
              <span className="text-xs text-gray-400">投研助理模式</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in"><Outlet /></div>
        </div>
      </main>
    </div>
  );
}
