import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Beaker, Play } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import RoleSwitcher from '@/components/common/RoleSwitcher';
import ExportButton from '@/components/common/ExportButton';
import DataSourcePanel from '@/components/workbench/DataSourcePanel';
import CalcToolPanel from '@/components/workbench/CalcToolPanel';
import ResultSummary from '@/components/workbench/ResultSummary';

export default function Workbench() {
  const loc = useLocation();
  const { additiveItems, loadSampleData, setRole, role } = useVerificationStore();

  useEffect(() => {
    if (additiveItems.length === 0) {
      loadSampleData();
    }
  }, [additiveItems.length, loadSampleData]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/85 border-b border-slate-200/80">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-soft">
              <Beaker size={18} />
            </div>
            <div className="font-serif text-lg font-bold text-slate-800 tracking-wide">
              食品添加剂残留核验
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <Link to="/" className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (loc.pathname === '/' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              核验工作台
            </Link>
            {role === 'engineer' && (
              <Link to="/review" className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (loc.pathname === '/review' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
                工程师复盘
              </Link>
            )}
            {role === 'student' && (
              <Link to="/result" className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (loc.pathname === '/result' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
                学生结果
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button
              className="btn-secondary"
              onClick={() => loadSampleData()}
              title="加载第一份样例数据"
            >
              <Play size={14} />加载样例
            </button>
            <RoleSwitcher />
            <ExportButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5">
        <div className="grid grid-cols-12 gap-5 h-[calc(100vh-7rem)] min-h-[720px]">
          <aside className="col-span-3 overflow-hidden">
            <DataSourcePanel />
          </aside>
          <section className="col-span-6 overflow-hidden">
            <CalcToolPanel />
          </section>
          <aside className="col-span-3 overflow-hidden">
            <ResultSummary />
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-200/60 py-3 text-center text-xs text-slate-400">
        食品添加剂残留核验工具 · 所有计算结果仅供参考，正式放行以配方工程师复核为准
      </footer>

      <button
        onClick={() => setRole(role === 'engineer' ? 'student' : 'engineer')}
        className="md:hidden fixed bottom-4 right-4 btn-primary shadow-card z-40"
      >
        切换角色
      </button>
    </div>
  );
}
