import { useState } from 'react';
import { Download, HelpCircle, MinusCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import FilterPanel from '@/components/FilterPanel';
import StatusTabs from '@/components/StatusTabs';
import WarningList from '@/components/WarningList';
import HelpModal from '@/components/HelpModal';
import { useWarningStore } from '@/store/useWarningStore';
import { exportWarningsToCSV } from '@/utils/export';

export default function WarningHome() {
  const [helpOpen, setHelpOpen] = useState(false);
  const getFilteredWarnings = useWarningStore((s) => s.getFilteredWarnings);
  const rerunWarnings = useWarningStore((s) => s.rerunWarnings);
  const warnings = getFilteredWarnings();
  const sampleLoaded = useWarningStore((s) => s.sampleLoaded);

  const negCount = warnings.filter((w) => w.isNegativeCorrection).length;

  const handleExport = () => {
    exportWarningsToCSV(warnings);
  };

  const handleRerun = () => {
    rerunWarnings();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-deep-sea-50/30">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-deep-sea-700 text-white flex items-center justify-center shadow-md">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">票据池质押风险预警</h1>
              <p className="text-xs text-slate-500">月底复核工作台</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRerun}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white ring-1 ring-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <RefreshCw size={16} />
              重跑预警
            </button>
            <button
              onClick={handleExport}
              disabled={warnings.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-deep-sea-700 bg-white ring-1 ring-slate-200 rounded-lg hover:bg-deep-sea-50 hover:text-deep-sea-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Download size={16} />
              导出
            </button>
            <button
              onClick={() => setHelpOpen(true)}
              className="p-2 text-slate-500 hover:text-deep-sea-700 hover:bg-slate-100 rounded-lg transition"
              title="预警说明"
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {sampleLoaded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="预警总数" value={warnings.length} tone="deep" />
            <StatCard label="已确认" value={warnings.filter((w) => w.status === 'confirmed').length} tone="emerald" />
            <StatCard label="待补件" value={warnings.filter((w) => w.status === 'pending').length} tone="amber" />
            <StatCard
              label="负数冲正"
              value={negCount}
              tone="red"
              icon={<MinusCircle size={16} />}
            />
          </div>
        )}

        <FilterPanel />

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <StatusTabs />
            <div className="text-xs text-slate-500">共 {warnings.length} 条记录</div>
          </div>
          <WarningList />
        </div>
      </main>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  tone: 'deep' | 'emerald' | 'amber' | 'red';
  icon?: React.ReactNode;
}

function StatCard({ label, value, tone, icon }: StatCardProps) {
  const tones: Record<StatCardProps['tone'], string> = {
    deep: 'from-deep-sea-700 to-deep-sea-600',
    emerald: 'from-emerald-600 to-emerald-500',
    amber: 'from-amber-500 to-amber-400',
    red: 'from-red-600 to-red-500',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm ${tones[tone]}`}>
        {icon || <ShieldAlert size={18} />}
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-900 font-mono">{value}</div>
      </div>
    </div>
  );
}
