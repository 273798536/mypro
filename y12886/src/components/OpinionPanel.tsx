import { useState, useRef } from 'react';
import { CheckCircle, XCircle, RotateCw, Edit, CheckSquare } from 'lucide-react';
import type { ProcessOpinion, GapItem, SupplementEntry } from '@/types';

interface OpinionPanelProps {
  opinion: ProcessOpinion | null;
  gapItems: GapItem[];
  supplementLog: SupplementEntry[];
  onConfirm: () => void;
  onReject: (reason: string) => void;
  onRerun: () => void;
  onSupplementGap: (gapId: string, value: number) => void;
}

const CONCLUSION_CONFIG: Record<string, { label: string; color: string }> = {
  safe: { label: '安全', color: '#2EC4B6' },
  caution: { label: '谨慎', color: '#FF6B35' },
  danger: { label: '危险', color: '#E63946' },
};

export default function OpinionPanel({
  opinion,
  gapItems,
  supplementLog,
  onConfirm,
  onReject,
  onRerun,
  onSupplementGap,
}: OpinionPanelProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [gapValues, setGapValues] = useState<Record<string, string>>({});
  const opinionRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);

  if (!opinion) return null;

  const config = CONCLUSION_CONFIG[opinion.conclusion] ?? CONCLUSION_CONFIG.caution;

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(rejectReason.trim());
    setRejectReason('');
    setRejectDialogOpen(false);
  };

  const handleSupplement = (gapId: string) => {
    const val = parseFloat(gapValues[gapId] ?? '');
    if (isNaN(val)) return;
    onSupplementGap(gapId, val);
    setGapValues((prev) => ({ ...prev, [gapId]: '' }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={onRerun}
          className="flex items-center gap-1.5 rounded-lg bg-[#0C2D48] px-4 py-2 text-sm text-white hover:opacity-90"
        >
          <RotateCw size={15} /> 重新运行
        </button>
        <button
          onClick={() => gapRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-1.5 rounded-lg bg-[#0C2D48] px-4 py-2 text-sm text-white hover:opacity-90"
        >
          <Edit size={15} /> 补录数据
        </button>
        <button
          onClick={() => opinionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-1.5 rounded-lg bg-[#0C2D48] px-4 py-2 text-sm text-white hover:opacity-90"
        >
          <CheckSquare size={15} /> 人工确认
        </button>
      </div>

      <div ref={opinionRef} className="overflow-hidden rounded-lg border border-gray-200">
        <div className="bg-[#0C2D48] px-4 py-2.5 text-sm font-medium text-white">
          处理意见 · 第{opinion.runCount}次运行
        </div>
        <div className="bg-white p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: config.color }}
            >
              {config.label}
            </span>
            {opinion.confirmed && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle size={14} /> 已确认
              </span>
            )}
            {opinion.rejected && (
              <span className="flex items-center gap-1 text-sm text-red-500">
                <XCircle size={14} /> 已否决
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{opinion.reason}</p>
          {opinion.rejected && opinion.rejectReason && (
            <p className="text-xs text-red-400">否决原因：{opinion.rejectReason}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onConfirm}
              disabled={opinion.confirmed}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认
            </button>
            <button
              onClick={() => setRejectDialogOpen(true)}
              disabled={opinion.rejected}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              否决
            </button>
          </div>
        </div>
      </div>

      {gapItems.length > 0 && (
        <div ref={gapRef} className="overflow-hidden rounded-lg border border-gray-200">
          <div className="bg-[#0C2D48] px-4 py-2.5 text-sm font-medium text-white">缺失数据</div>
          <div className="bg-white divide-y divide-gray-100">
            {gapItems.map((gap) => (
              <div key={gap.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{gap.timestamp}</span>
                  <span className="text-sm text-gray-700">{gap.field}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">缺失</span>
                </div>
                {gap.status === 'filled' ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    {gap.filledValue} <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs">已补录</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={gapValues[gap.id] ?? ''}
                      onChange={(e) => setGapValues((prev) => ({ ...prev, [gap.id]: e.target.value }))}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => handleSupplement(gap.id)}
                      className="rounded bg-[#0C2D48] px-3 py-1 text-xs text-white hover:opacity-90"
                    >
                      补录
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {supplementLog.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="bg-[#0C2D48] px-4 py-2.5 text-sm font-medium text-white">补录记录</div>
          <div className="bg-white p-4">
            {supplementLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 last:pb-0">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0C2D48]" />
                <div className="text-sm">
                  <span className="text-gray-400">{entry.timestamp}</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span className="text-gray-600">{entry.operator}</span>
                  <p className="mt-0.5 text-gray-700">
                    将 <span className="font-medium">{entry.field}</span> 从{' '}
                    <span className="text-red-400">{entry.oldValue}</span> 修改为{' '}
                    <span className="text-green-600">{entry.newValue}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-gray-800">否决原因</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full rounded border border-gray-300 p-2 text-sm focus:border-[#0C2D48] focus:outline-none"
              placeholder="请输入否决原因…"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="rounded-lg bg-red-500 px-4 py-1.5 text-sm text-white hover:bg-red-600"
              >
                确认否决
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
