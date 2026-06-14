import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Point } from '@/types';
import { Send, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';

function parsePoints(text: string): Point[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const points: Point[] = [];
  const pairs = trimmed.split(/[;\s]+/).filter(Boolean);
  for (const pair of pairs) {
    const match = pair.match(/\(?(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)\)?/);
    if (!match) continue;
    points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
  }
  return points.length > 0 ? points : null;
}

export default function SubmitForm() {
  const { submitRecord } = useStore();
  const [sampleId, setSampleId] = useState('');
  const [title, setTitle] = useState('');
  const [pointsText, setPointsText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'duplicate'; msg: string } | null>(null);

  const handleSubmit = () => {
    if (!sampleId.trim()) return;
    const inputPoints = parsePoints(pointsText);
    const rawInput = pointsText.trim()
      ? `points = [${(inputPoints || []).map((p) => `(${p.x},${p.y})`).join(', ')}]`
      : 'points = []';
    const rec = submitRecord({
      sampleId: sampleId.trim(),
      title: title.trim() || `提交样本 ${sampleId.trim()}`,
      inputPoints,
      rawInput,
    });
    if (rec.submittedCount > 1) {
      setFeedback({ type: 'duplicate', msg: `sampleId "${sampleId.trim()}" 已存在，提交次数增至 ${rec.submittedCount}（列表已去重，不会重复计数）` });
    } else {
      setFeedback({ type: 'success', msg: `新记录已创建：${rec.sampleId}，异常类型 ${rec.anomalyType}` });
    }
  };

  const handleReset = () => {
    setSampleId('');
    setTitle('');
    setPointsText('');
    setFeedback(null);
  };

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-ink-800 mb-3">提交样本 · 两次相同请求幂等去重</h3>
      <div className="grid grid-cols-[200px_1fr_1fr] gap-3 mb-3">
        <div>
          <label className="text-[11px] text-ink-600 mb-1 block">样本 ID（幂等键）</label>
          <input
            type="text"
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
            placeholder="如 CH-2024-0301"
            className="w-full border border-paper-200 rounded px-2 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-ink-800/30"
          />
        </div>
        <div>
          <label className="text-[11px] text-ink-600 mb-1 block">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="可选，自动生成"
            className="w-full border border-paper-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-ink-800/30"
          />
        </div>
        <div>
          <label className="text-[11px] text-ink-600 mb-1 block">点集坐标（留空 = 空集合）</label>
          <input
            type="text"
            value={pointsText}
            onChange={(e) => setPointsText(e.target.value)}
            placeholder="如 0,0; 4,0; 4,3; 0,3"
            className="w-full border border-paper-200 rounded px-2 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-ink-800/30"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSubmit} className="btn-primary" disabled={!sampleId.trim()}>
          <Send size={14} /> 提交
        </button>
        <button onClick={handleReset} className="btn-ghost">
          <RotateCcw size={14} /> 重置
        </button>
        {feedback && (
          <span className={`flex items-center gap-1.5 text-xs ${feedback.type === 'success' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  );
}
