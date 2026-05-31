import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import TrackArea from '@/components/TrackArea';
import JudgmentFeedback from '@/components/JudgmentFeedback';
import SwitchIndicator from '@/components/SwitchIndicator';
import SourcePanel from '@/components/SourcePanel';
import ControlBar from '@/components/ControlBar';
import { Train, Music, ChevronRight } from 'lucide-react';

function StartScreen() {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[#1a1d2e]">
      <div className="mb-8 flex items-center gap-4">
        <Train size={48} className="text-cyan-400 drop-shadow-[0_0_12px_rgba(61,193,211,0.6)]" />
        <h1 className="font-display text-4xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(240,168,48,0.4)] tracking-wider">
          节拍列车编组
        </h1>
      </div>

      <p className="text-gray-400 text-sm mb-8 max-w-md text-center leading-relaxed" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
        在多轨道上操控列车编组，同步完成节拍敲击与轨道调度。<br />
        三源冲突时先留痕再判定，结算可追溯每一次判定的来龙去脉。
      </p>

      <div className="flex items-center gap-6 mb-10">
        <div className="flex items-center gap-2">
          <Music size={16} className="text-amber-400" />
          <span className="text-amber-400/80 text-xs" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>节拍轨</span>
        </div>
        <ChevronRight size={14} className="text-gray-600" />
        <div className="flex items-center gap-2">
          <Train size={16} className="text-cyan-400" />
          <span className="text-cyan-400/80 text-xs" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>列车</span>
        </div>
        <ChevronRight size={14} className="text-gray-600" />
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-green-500/60" />
          <span className="text-green-400/80 text-xs" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>站台</span>
        </div>
      </div>

      <button
        onClick={startGame}
        className="px-10 py-4 rounded-xl font-display text-lg font-bold tracking-wider transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(240,168,48,0.3), rgba(61,193,211,0.3))',
          border: '1px solid rgba(240,168,48,0.5)',
          color: '#f0a830',
          boxShadow: '0 0 20px rgba(240,168,48,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        开始游戏
      </button>

      <div className="mt-8 flex items-center gap-3">
        <span className="text-gray-500 text-xs" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>按键</span>
        {['D', 'F', 'J', 'K'].map((key) => (
          <span
            key={key}
            className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

function PausedOverlay() {
  const resumeGame = useGameStore((s) => s.resumeGame);
  const restartGame = useGameStore((s) => s.restartGame);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
      <div className="font-display text-3xl font-bold text-white mb-8 drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]">
        暂停
      </div>
      <div className="flex gap-4">
        <button
          onClick={resumeGame}
          className="px-8 py-3 rounded-lg font-display text-sm tracking-wider transition-colors"
          style={{
            background: 'rgba(46,213,115,0.2)',
            border: '1px solid rgba(46,213,115,0.4)',
            color: '#2ed573',
          }}
        >
          继续
        </button>
        <button
          onClick={restartGame}
          className="px-8 py-3 rounded-lg font-display text-sm tracking-wider transition-colors"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  );
}

function EndedOverlay() {
  const navigate = useNavigate();
  const score = useGameStore((s) => s.score);
  const restartGame = useGameStore((s) => s.restartGame);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/70 backdrop-blur-sm">
      <div className="font-display text-2xl font-bold text-amber-400 mb-2 drop-shadow-[0_0_16px_rgba(240,168,48,0.4)]">
        演奏完毕
      </div>
      <div className="font-display text-5xl font-black text-white mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
        {score.toLocaleString()}
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/settlement')}
          className="px-8 py-3 rounded-lg font-display text-sm tracking-wider transition-colors"
          style={{
            background: 'rgba(240,168,48,0.2)',
            border: '1px solid rgba(240,168,48,0.4)',
            color: '#f0a830',
          }}
        >
          查看结算
        </button>
        <button
          onClick={() => { restartGame(); }}
          className="px-8 py-3 rounded-lg font-display text-sm tracking-wider transition-colors"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          再来一局
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  useGameLoop();

  const phase = useGameStore((s) => s.phase);

  if (phase === 'idle') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#1a1d2e]">
        <StartScreen />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#1a1d2e]">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <TrackArea />
          <JudgmentFeedback />
          <SwitchIndicator />
          {phase === 'paused' && <PausedOverlay />}
          {phase === 'ended' && <EndedOverlay />}
        </div>
        <div
          className="w-52 flex flex-col gap-3 p-3 border-l"
          style={{
            background: 'rgba(26, 29, 46, 0.95)',
            borderColor: 'rgba(240, 168, 48, 0.1)',
          }}
        >
          <div
            className="text-xs text-gray-400 mb-1"
            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            三源状态
          </div>
          <SourcePanel />
          <div className="flex-1" />
          <div
            className="text-xs text-gray-500 leading-relaxed"
            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            <div className="mb-1 text-gray-400">规则说明</div>
            <div>节拍轨为主信息源</div>
            <div>列车和站台补证据</div>
            <div>冲突时先留痕再判定</div>
          </div>
        </div>
      </div>
      <ControlBar />
    </div>
  );
}
