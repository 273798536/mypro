import CardPoolConfig from '@/components/CardPoolConfig';
import PullArea from '@/components/PullArea';
import PullHistory from '@/components/PullHistory';
import { FlaskConical, BookOpen, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGachaStore } from '@/store/useGachaStore';

export default function Home() {
  const { session, resetSession } = useGachaStore();

  return (
    <div className="flex h-screen flex-col bg-gacha-bg bg-noise">
      <header className="flex items-center justify-between border-b border-gacha-border px-6 py-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-gacha-gold" />
          <h1 className="font-display text-lg font-bold tracking-wider text-gacha-gold text-shadow-glow-gold">
            GACHA LAB
          </h1>
          <span className="text-xs text-slate-500">概率抽卡实验室</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.isActive && (
            <button
              onClick={resetSession}
              className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-500/20"
            >
              <RotateCcw className="h-3 w-3" /> 结束实验
            </button>
          )}
          <Link
            to="/review"
            className="flex items-center gap-1 rounded border border-gacha-border bg-gacha-card px-3 py-1 text-xs text-slate-300 transition-colors hover:border-gacha-purple/50 hover:text-gacha-purple"
          >
            <BookOpen className="h-3 w-3" /> 回看分析
          </Link>
        </div>
      </header>

      <main className="flex flex-1 gap-4 overflow-hidden p-4">
        <aside className="w-72 shrink-0">
          <CardPoolConfig />
        </aside>
        <section className="flex-1">
          <PullArea />
        </section>
        <aside className="w-80 shrink-0">
          <PullHistory />
        </aside>
      </main>
    </div>
  );
}
