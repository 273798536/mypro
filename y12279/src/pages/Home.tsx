import { HandScene } from '@/components/HandScene';
import { PracticeReport } from '@/components/PracticeReport';
import { ScoreTimeline } from '@/components/ScoreTimeline';
import { PlaybackControls } from '@/components/PlaybackControls';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { Music } from 'lucide-react';

export default function Home() {
  const { session } = usePlaybackStore();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="h-16 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
              钢琴指法空间回放
            </h1>
            <p className="text-xs text-slate-400">专业评审版</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{session.title}</div>
          <div className="text-xs text-slate-400">{session.date}</div>
        </div>
      </header>

      <main className="h-[calc(100vh-4rem)] grid grid-cols-12 gap-4 p-4">
        <div className="col-span-7 relative rounded-xl overflow-hidden border border-slate-700">
          <HandScene />
          <PlaybackControls />
        </div>

        <div className="col-span-5 grid grid-rows-2 gap-4">
          <div className="rounded-xl overflow-hidden border border-slate-700">
            <PracticeReport />
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-700">
            <ScoreTimeline />
          </div>
        </div>
      </main>

      <footer className="h-8 bg-slate-900/50 border-t border-slate-800 flex items-center justify-center text-xs text-slate-500">
        <span>关键点丢失 · 小节错位 · 左右手混淆 - 分类展示，复核有据</span>
      </footer>
    </div>
  );
}
