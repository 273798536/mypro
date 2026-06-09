import { Link, useLocation } from 'react-router-dom';
import { Beaker, ArrowLeft } from 'lucide-react';
import RoleSwitcher from '@/components/common/RoleSwitcher';
import ExportButton from '@/components/common/ExportButton';
import TempProfileTimeline from '@/components/review/TempProfileTimeline';
import HistoryRecordTable from '@/components/review/HistoryRecordTable';
import TraceabilityChain from '@/components/review/TraceabilityChain';

export default function Review() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/85 border-b border-slate-200/80">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-soft">
              <Beaker size={18} />
            </div>
            <div className="font-serif text-lg font-bold text-slate-800 tracking-wide">
              食品添加剂残留核验 · 工程师复盘
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <Link to="/" className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (loc.pathname === '/' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              核验工作台
            </Link>
            <Link to="/review" className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (loc.pathname === '/review' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              工程师复盘
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/" className="btn-ghost">
              <ArrowLeft size={14} />返回工作台
            </Link>
            <RoleSwitcher />
            <ExportButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <TempProfileTimeline />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <HistoryRecordTable />
            <TraceabilityChain />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/60 py-3 text-center text-xs text-slate-400">
        食品添加剂残留核验工具 · 所有计算结果仅供参考，正式放行以配方工程师复核为准
      </footer>
    </div>
  );
}
