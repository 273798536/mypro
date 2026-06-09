import { Link, useLocation } from 'react-router-dom';
import { Beaker } from 'lucide-react';
import RoleSwitcher from '@/components/common/RoleSwitcher';
import ExportButton from '@/components/common/ExportButton';
import GradeResultCard from '@/components/result/GradeResultCard';

export default function Result() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/85 border-b border-slate-200/80">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-soft">
              <Beaker size={18} />
            </div>
            <div className="font-serif text-lg font-bold text-slate-800 tracking-wide">
              食品添加剂残留核验 · 学生结果
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <Link to="/" className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (loc.pathname === '/' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              核验工作台
            </Link>
            <Link to="/result" className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (loc.pathname === '/result' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              学生结果
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <RoleSwitcher />
            <ExportButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        <GradeResultCard />
      </main>

      <footer className="border-t border-slate-200/60 py-3 text-center text-xs text-slate-400">
        食品添加剂残留核验工具 · 所有计算结果仅供参考，正式放行以配方工程师复核为准
      </footer>
    </div>
  );
}
