import { Plane, Settings, HelpCircle, Download } from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';

export function Header() {
  const { conflicts, gates, taxiways, exportReport } = useSandboxStore();

  const handleExport = () => {
    const reportData = exportReport();
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conflict-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="bg-slate-900/95 border-b border-slate-700/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Plane className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">机场滑行冲突沙盘</h1>
            <p className="text-xs text-slate-400">Apron Taxiing Conflict Sandbox</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400">{gates.length}</div>
              <div className="text-xs text-slate-500">机位</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">{taxiways.length}</div>
              <div className="text-xs text-slate-500">滑行道</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{conflicts.length}</div>
              <div className="text-xs text-slate-500">冲突</div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-400">导出报告</span>
            </button>
            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
