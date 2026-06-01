import { useRef } from 'react';
import ExpressionInput from '@/components/ExpressionInput';
import MethodSelector from '@/components/MethodSelector';
import WarningPanel from '@/components/WarningPanel';
import ResultChart from '@/components/ResultChart';
import ResultCard from '@/components/ResultCard';
import ExportBar from '@/components/ExportBar';
import { Sigma, BookOpen } from 'lucide-react';

export default function Home() {
  const exportAreaRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Sigma size={18} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-tight">积分近似误差教具</h1>
              <p className="text-[10px] text-slate-500">数值积分 · 边界检测 · 课堂复盘</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BookOpen size={14} />
            <span>助教工作台</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          <aside className="space-y-5">
            <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <ExpressionInput />
            </section>

            <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <MethodSelector />
            </section>

            <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <ResultCard />
            </section>
          </aside>

          <div ref={exportAreaRef} className="space-y-5">
            <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <WarningPanel />
            </section>

            <section className="p-4 bg-slate-900 rounded-xl border border-slate-800 min-h-[420px] flex flex-col">
              <ResultChart />
            </section>

            <div className="flex items-center justify-between px-1">
              <ExportBar exportAreaRef={exportAreaRef} />
              <div className="text-[10px] text-slate-600">
                截图与报告均包含边界提示内容
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
