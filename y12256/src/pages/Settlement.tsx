import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronDown, ChevronUp, RotateCcw, Play } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { ErrorDeduction, ConflictDetail } from '@/types';

const ERROR_TAG_COLORS: Record<string, string> = {
  timing_deviation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  conflict_misjudge: 'bg-red-500/20 text-red-400 border-red-500/40',
  syncopation_miss: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  speed_change_combo_break: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  combo_misjudge_late: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  switch_delay_misjudge: 'bg-red-500/20 text-red-400 border-red-500/40',
};

function ScoreRing({ perfect, great, good, miss }: { perfect: number; great: number; good: number; miss: number }) {
  const total = perfect + great + good + miss;
  if (total === 0) return null;
  const pP = (perfect / total) * 360;
  const gP = (great / total) * 360;
  const g2P = (good / total) * 360;
  const gradient = `conic-gradient(#f0a830 0deg ${pP}deg, #2ed573 ${pP}deg ${pP + gP}deg, #3dc1d3 ${pP + gP}deg ${pP + gP + g2P}deg, #e74c3c ${pP + gP + g2P}deg 360deg)`;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <div className="w-40 h-40 rounded-full" style={{ background: gradient }} />
      <div className="absolute inset-4 rounded-full bg-[#1a1d2e] flex items-center justify-center">
        <span className="font-display text-white text-sm">判定分布</span>
      </div>
    </div>
  );
}

function ConflictNode({ conflict }: { conflict: ConflictDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pl-8 pb-4">
      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(231,76,60,0.6)]" />
      <div
        className="bg-[#252840] rounded-lg p-3 cursor-pointer hover:bg-[#2d3050] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <span className="text-red-400 text-sm font-medium">{(conflict.timestamp / 1000).toFixed(2)}s</span>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
        <div className="text-gray-300 text-xs mt-1">
          {conflict.sourceA} vs {conflict.sourceB}
        </div>
        {open && (
          <div className="mt-2 space-y-1 text-xs border-t border-gray-600 pt-2">
            <div className="text-gray-400">字段: <span className="text-cyan-400">{conflict.field}</span></div>
            <div className="text-gray-400">值A: <span className="text-amber-400">{conflict.valueA}</span></div>
            <div className="text-gray-400">值B: <span className="text-amber-400">{conflict.valueB}</span></div>
            <div className="text-gray-400">解决: <span className="text-green-400">{conflict.resolution}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settlement() {
  const navigate = useNavigate();
  const { score, maxCombo, perfectCount, greatCount, goodCount, missCount, errorDeductions, conflicts, restartGame } = useGameStore();
  const totalDeduction = errorDeductions.reduce((s, d) => s + d.deduction, 0);

  return (
    <div className="min-h-screen bg-[#1a1d2e] text-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl text-center mb-8 text-amber-400 tracking-wider">结算</h1>

      <section className="mb-10">
        <div className="text-center mb-6">
          <Trophy size={40} className="mx-auto text-amber-400 mb-2" />
          <div className="font-display text-5xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(240,168,48,0.5)]">
            {score.toLocaleString()}
          </div>
        </div>
        <ScoreRing perfect={perfectCount} great={greatCount} good={goodCount} miss={missCount} />
        <div className="flex justify-center gap-6 mt-6 text-sm">
          <div className="text-center">
            <div className="font-display text-2xl text-amber-400">{perfectCount}</div>
            <div className="text-amber-400/70">Perfect</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-green-400">{greatCount}</div>
            <div className="text-green-400/70">Great</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-cyan-400">{goodCount}</div>
            <div className="text-cyan-400/70">Good</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-red-400">{missCount}</div>
            <div className="text-red-400/70">Miss</div>
          </div>
        </div>
        <div className="text-center mt-4">
          <span className="text-gray-400 text-sm">最大连击 </span>
          <span className="font-display text-xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{maxCombo}</span>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-lg text-cyan-400 mb-4">扣分详情</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-600">
                <th className="py-2 px-2 text-left">序号</th>
                <th className="py-2 px-2 text-left">时间</th>
                <th className="py-2 px-2 text-left">错因类型</th>
                <th className="py-2 px-2 text-left">错因描述</th>
                <th className="py-2 px-2 text-left">来源</th>
                <th className="py-2 px-2 text-right">扣分值</th>
              </tr>
            </thead>
            <tbody>
              {errorDeductions.map((d: ErrorDeduction, i: number) => (
                <tr key={d.id} className="border-b border-gray-700/50 hover:bg-white/5">
                  <td className="py-2 px-2 text-gray-300">{i + 1}</td>
                  <td className="py-2 px-2 text-gray-300">{d.judgmentId.slice(0, 8)}</td>
                  <td className="py-2 px-2">
                    <span className={`text-xs px-2 py-0.5 rounded border ${ERROR_TAG_COLORS[d.errorType] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'}`}>
                      {d.errorType}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-300 max-w-[200px] truncate">{d.description}</td>
                  <td className="py-2 px-2 text-gray-400">{d.source}</td>
                  <td className="py-2 px-2 text-right text-red-400">-{d.deduction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-right mt-3 text-sm">
          <span className="text-gray-400">扣分合计: </span>
          <span className="text-red-400 font-display">-{totalDeduction}</span>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-lg text-red-400 mb-4">冲突事件</h2>
        {conflicts.length === 0 ? (
          <div className="text-gray-500 text-sm">无冲突事件</div>
        ) : (
          <div className="relative before:absolute before:left-[7px] before:top-0 before:bottom-0 before:w-px before:bg-gray-600">
            {conflicts.map((c) => (
              <ConflictNode key={c.id} conflict={c} />
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => navigate('/replay')}
          className="flex items-center gap-2 px-6 py-3 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors font-display text-sm"
        >
          <Play size={16} /> 复盘
        </button>
        <button
          onClick={() => { restartGame(); navigate('/'); }}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 hover:bg-amber-500/30 transition-colors font-display text-sm"
        >
          <RotateCcw size={16} /> 再来一局
        </button>
      </div>
    </div>
  );
}
