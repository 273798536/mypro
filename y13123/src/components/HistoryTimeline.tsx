import { useState } from 'react';
import { History, Pencil, Save, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function HistoryTimeline() {
  const history = useAppStore((s) => s.history);
  const modify = useAppStore((s) => s.modifyJudgement);
  const [showForm, setShowForm] = useState(false);
  const [field, setField] = useState('节点 C 异常判定');
  const [before, setBefore] = useState('正常');
  const [after, setAfter] = useState('异常（误差）');
  const [reason, setReason] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const submit = () => {
    if (!field || !before || !after) return;
    modify({ field, before, after, reason: reason || undefined });
    setField('节点 C 异常判定');
    setBefore('正常');
    setAfter('异常（误差）');
    setReason('');
    setShowForm(false);
  };

  return (
    <div className="paper-card rounded-xl p-4 animate-fadeSlideUp" style={{ animationDelay: '280ms' }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-[14px] text-ink-900">
          <History className="h-4 w-4 text-ink-800" />
          变更历史（老叶临时判断留痕）
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-ink-900/25 bg-white px-2.5 py-1 text-[11.5px] text-ink-900 transition-all hover:bg-ink-900/5"
        >
          <Pencil className="h-3 w-3" />
          新修改
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-lg border border-gold-700/30 bg-paper-50 p-3 animate-fadeSlideUp">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slateData-500">字段</label>
              <input
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-gold-700/30 bg-white px-2 py-1 text-[12px] outline-none focus:border-ink-800/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slateData-500">修改前</label>
                <input
                  value={before}
                  onChange={(e) => setBefore(e.target.value)}
                  className="mt-0.5 w-full rounded-md border border-gold-700/30 bg-white px-2 py-1 text-[12px] outline-none focus:border-ink-800/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slateData-500">修改后</label>
                <input
                  value={after}
                  onChange={(e) => setAfter(e.target.value)}
                  className="mt-0.5 w-full rounded-md border border-gold-700/30 bg-white px-2 py-1 text-[12px] outline-none focus:border-ink-800/50"
                />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <label className="block text-[11px] text-slateData-500">判断原因</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-0.5 w-full rounded-md border border-gold-700/30 bg-white px-2 py-1 text-[12px] outline-none focus:border-ink-800/50"
              placeholder="老叶临时判断原因（可选）"
            />
          </div>
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              onClick={() => setShowForm(false)}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] text-slateData-500 hover:bg-gold-700/10"
            >
              <X className="h-3 w-3" /> 取消
            </button>
            <button
              onClick={submit}
              className="inline-flex items-center gap-1 rounded-md bg-ink-900 px-2.5 py-1 text-[11.5px] text-paper-50 hover:bg-ink-950"
            >
              <Save className="h-3 w-3" /> 记录
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-4 top-3 h-px w-[calc(100%-32px)] border-t-2 border-dashed border-gold-700/40" />
        <div className="scroll-thin flex gap-6 overflow-x-auto pb-1 pl-0 pr-2">
          {history.map((h, idx) => {
            const active = activeId === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setActiveId(active ? null : h.id)}
                className="group relative shrink-0 pl-0 pr-2 pt-0.5 text-left animate-popIn"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <span
                  className={cn(
                    'relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                    active
                      ? 'border-ink-900 bg-ink-900 text-paper-50 animate-diffGlow'
                      : 'border-gold-700 bg-paper-50 text-ink-900 group-hover:border-ink-900'
                  )}
                >
                  <span className="font-mono-data text-[11px] font-bold">
                    {idx + 1}
                  </span>
                </span>
                <div
                  className={cn(
                    'mt-2 w-[220px] rounded-lg border p-2 text-[11.5px] transition-all',
                    active
                      ? 'border-ink-900/40 bg-paper-50 shadow-card'
                      : 'border-gold-700/20 bg-white group-hover:bg-paper-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[12px] text-ink-900">
                      {h.field}
                    </span>
                    <span className="font-mono-data text-[10px] text-slateData-500">
                      {h.timestamp.slice(5)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1 text-[11px]">
                    <span className="line-through text-slateData-500">
                      {h.before}
                    </span>
                    <span className="text-slateData-300">→</span>
                    <span className="font-semibold text-ink-900">{h.after}</span>
                  </div>
                  {h.reason && (
                    <div className="mt-1 rounded bg-gold-900/5 px-1.5 py-1 font-serif text-[10.5px] leading-snug text-gold-900">
                      「{h.reason}」
                    </div>
                  )}
                  <div className="mt-1 text-[10px] text-slateData-500">
                    操作人：{h.operator}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
