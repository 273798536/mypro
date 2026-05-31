import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, ChevronDown, ChevronUp, RotateCcw, ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { JudgmentRecord, ScoreMapping } from '@/types';

const RESULT_COLORS: Record<string, string> = {
  perfect: 'text-amber-400',
  great: 'text-green-400',
  good: 'text-cyan-400',
  miss: 'text-red-400',
};

function JudgmentRow({ judgment, expanded, onToggle }: { judgment: JudgmentRecord; expanded: boolean; onToggle: () => void }) {
  const s = judgment.sources;
  return (
    <>
      <tr
        className="border-b border-gray-700/50 hover:bg-white/5 cursor-pointer"
        onClick={onToggle}
      >
        <td className="py-2 px-2 text-gray-300 text-xs">{judgment.beatNoteId.slice(0, 8)}</td>
        <td className="py-2 px-2 text-gray-400 text-xs">{s.beatTrack.expectedTrack}</td>
        <td className="py-2 px-2 text-gray-400 text-xs">{(s.beatTrack.expectedTime / 1000).toFixed(2)}s</td>
        <td className="py-2 px-2 text-gray-400 text-xs">{s.train.actualTrack}</td>
        <td className="py-2 px-2 text-gray-400 text-xs">{(s.train.arrivalTime / 1000).toFixed(2)}s</td>
        <td className="py-2 px-2 text-gray-400 text-xs">{s.platform.designatedTrack}</td>
        <td className={`py-2 px-2 text-xs font-bold ${RESULT_COLORS[judgment.result]}`}>
          {judgment.result.toUpperCase()}
        </td>
        <td className="py-2 px-2 text-gray-400 text-xs max-w-[100px] truncate">{judgment.finalBasis}</td>
        <td className="py-2 px-2 text-center">
          {judgment.hasConflict ? (
            <span className="text-red-400 text-xs">⚠</span>
          ) : (
            <span className="text-gray-600 text-xs">—</span>
          )}
          {expanded ? <ChevronUp size={12} className="inline ml-1 text-gray-500" /> : <ChevronDown size={12} className="inline ml-1 text-gray-500" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#1e2136]">
          <td colSpan={9} className="py-3 px-4">
            {judgment.conflictDetails.length > 0 && (
              <div className="mb-2">
                <div className="text-red-400 text-xs font-medium mb-1">冲突详情</div>
                {judgment.conflictDetails.map((c) => (
                  <div key={c.id} className="text-gray-400 text-xs ml-2 mb-1">
                    {c.sourceA} vs {c.sourceB} — 字段: <span className="text-cyan-400">{c.field}</span> — 解决: <span className="text-green-400">{c.resolution}</span>
                  </div>
                ))}
              </div>
            )}
            {judgment.errorDeductions.length > 0 && (
              <div>
                <div className="text-amber-400 text-xs font-medium mb-1">扣分记录</div>
                {judgment.errorDeductions.map((d) => (
                  <div key={d.id} className="text-gray-400 text-xs ml-2 mb-1">
                    [{d.errorType}] {d.description} — <span className="text-red-400">-{d.deduction}</span> ({d.source})
                  </div>
                ))}
              </div>
            )}
            {judgment.conflictDetails.length === 0 && judgment.errorDeductions.length === 0 && (
              <div className="text-gray-600 text-xs">无附加信息</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Report() {
  const navigate = useNavigate();
  const { judgments, getMapping, exportScore, restartGame } = useGameStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mapping: ScoreMapping[] = useMemo(() => getMapping(), [getMapping]);
  const exportData = useMemo(() => exportScore(), [exportScore]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `score_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const jsonPreview = useMemo(() => {
    const str = JSON.stringify(exportData, null, 2);
    return str.slice(0, 500) + (str.length > 500 ? '...' : '');
  }, [exportData]);

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#1a1d2e] text-white px-4 py-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl text-center mb-8 text-purple-400 tracking-wider">练习报告</h1>

      <section className="mb-10">
        <h2 className="font-display text-lg text-white/80 mb-4">判定追溯表</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-600 text-xs">
                <th className="py-2 px-2 text-left">拍号</th>
                <th className="py-2 px-2 text-left">节拍轨轨道</th>
                <th className="py-2 px-2 text-left">节拍轨时间</th>
                <th className="py-2 px-2 text-left">列车轨道</th>
                <th className="py-2 px-2 text-left">列车到达</th>
                <th className="py-2 px-2 text-left">站台轨道</th>
                <th className="py-2 px-2 text-left">判定结果</th>
                <th className="py-2 px-2 text-left">判定依据</th>
                <th className="py-2 px-2 text-left">冲突标记</th>
              </tr>
            </thead>
            <tbody>
              {judgments.map((j) => (
                <JudgmentRow
                  key={j.id}
                  judgment={j}
                  expanded={expandedId === j.id}
                  onToggle={() => toggleRow(j.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {judgments.length === 0 && <div className="text-gray-500 text-sm mt-2">无判定记录</div>}
      </section>

      <section className="mb-10">
        <h2 className="font-display text-lg text-white/80 mb-4">成绩映射</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-600 text-xs">
                <th className="py-2 px-2 text-left">节拍轨ID</th>
                <th className="py-2 px-2 text-left">列车ID</th>
                <th className="py-2 px-2 text-left">站台ID</th>
                <th className="py-2 px-2 text-left">判定ID</th>
                <th className="py-2 px-2 text-left">成绩记录ID</th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((m) => (
                <tr key={m.judgmentId} className="border-b border-gray-700/50 hover:bg-white/5">
                  <td className="py-2 px-2 text-gray-300 text-xs">{m.beatTrackId.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-gray-300 text-xs">{m.trainId.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-gray-300 text-xs">{m.platformId.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-cyan-400 text-xs">{m.judgmentId.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-amber-400 text-xs">{m.scoreRecordId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-start gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 hover:bg-amber-500/30 transition-colors font-display text-sm shrink-0"
          >
            <FileDown size={16} /> 导出 JSON
          </button>
          <pre className="flex-1 bg-[#252840] rounded-lg p-3 text-xs text-gray-400 overflow-x-auto max-h-40">
            {jsonPreview}
          </pre>
        </div>
      </section>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => navigate('/replay')}
          className="flex items-center gap-2 px-6 py-3 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors font-display text-sm"
        >
          <ArrowLeft size={16} /> 返回复盘
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
