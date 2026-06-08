import { Link } from 'react-router-dom';
import { Waves, Camera, FileCheck, Layers } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const records = useDataStore((s) => s.records);
  const abnormal = records.filter((r) => r.abnormalFlags.some((f) => !f.resolved)).length;

  return (
    <div className="w-full h-full flex flex-col bg-ocean-950 text-slate-200 font-sans">
      <header className="h-11 flex items-center justify-between px-4 border-b border-ocean-700 bg-ocean-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <Waves className="w-5 h-5 text-data-cyan" />
          <span className="text-sm font-semibold text-slate-100 tracking-wide">海洋涡旋三维流场</span>
          <span className="chip-ocean hidden sm:inline-flex">工程评审员版</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-transparent hover:border-ocean-600 hover:bg-ocean-800/60 text-slate-300 hover:text-data-cyan transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D 渲染</span>
          </Link>
          <Link
            to="/export-review"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-transparent hover:border-ocean-600 hover:bg-ocean-800/60 text-slate-300 hover:text-data-cyan transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>导出检查</span>
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-500">记录数</span>
          <span className="text-data-cyan">{records.length}</span>
          {abnormal > 0 && (
            <>
              <span className="text-slate-700">|</span>
              <span className="text-data-red">待复核 {abnormal}</span>
            </>
          )}
          <Camera className="w-3.5 h-3.5 text-slate-600 ml-1" />
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
