import AlertBar from '@/components/AlertBar';
import GraphCanvas from '@/components/GraphCanvas';
import ProblemList from '@/components/ProblemList';
import CalibrationPanel from '@/components/CalibrationPanel';
import ReviewCard from '@/components/ReviewCard';
import HistoryTimeline from '@/components/HistoryTimeline';
import MaterialArchive from '@/components/MaterialArchive';
import RerunButton from '@/components/RerunButton';
import { BookOpenCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen w-full px-4 py-5 lg:px-8">
      <header className="mx-auto mb-4 flex max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-900 text-paper-50 shadow-card">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-[20px] text-ink-900">
              最短路径图表解释
            </h1>
            <p className="text-[11.5px] text-slateData-500">
              图表 · 清单 · 口径 · 异常 · 参数 · 历史 · 解释 — 同页闭环
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-gold-700/30 bg-paper-50 px-2.5 py-1 text-[11.5px] text-gold-900 md:inline">
            数学组 · 老叶工作台
          </span>
          <RerunButton />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4">
        <AlertBar />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[26%_44%_30%]">
          <div className="min-h-[620px]">
            <ProblemList />
          </div>
          <div className="min-w-0">
            <GraphCanvas />
            <CalibrationPanel />
          </div>
          <div className="min-h-[620px]">
            <ReviewCard />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[58%_42%]">
          <HistoryTimeline />
          <MaterialArchive />
        </section>

        <footer className="pt-1 pb-4 text-center text-[11px] text-slateData-500">
          交付说明：图表、题目清单、计算口径、参数版本、异常点、历史记录、后补说明均在本页可查；
          <br className="sm:hidden" />
          算法值班人请使用右上角「一键重跑」自助校验材料完整性。
        </footer>
      </main>
    </div>
  );
}
