import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileUp, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { buildDemoImportRequest } from '@/lib/demoData';
import type { ImportResponse } from '@shared/types';

export function ImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [reusedInfo, setReusedInfo] = useState<ImportResponse | null>(null);
  const importing = useReviewStore((s) => s.submitting);
  const importBatch = useReviewStore((s) => s.importBatch);
  const fetchDashboard = useReviewStore((s) => s.fetchDashboard);
  const fetchBatches = useReviewStore((s) => s.fetchBatches);
  const navigate = useNavigate();

  if (!open) return null;

  const loadDemo = () => {
    setText(JSON.stringify(buildDemoImportRequest(), null, 2));
    setLocalError(null);
  };

  const submit = async () => {
    setLocalError(null);
    setReusedInfo(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setLocalError('JSON 格式错误，请检查输入');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || !('samples' in parsed)) {
      setLocalError('缺少必填字段 samples，或数据结构不正确');
      return;
    }
    try {
      const res = await importBatch(parsed as Parameters<typeof importBatch>[0]);
      await Promise.all([fetchDashboard(), fetchBatches()]);
      if (res.reused) {
        setReusedInfo(res);
        setTimeout(() => {
          navigate(`/batches/${res.batchId}`);
          onClose();
          setText('');
        }, 1800);
      } else {
        navigate(`/batches/${res.batchId}`);
        onClose();
        setText('');
      }
    } catch (e) {
      setLocalError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-2xl bg-paper-50 border border-ink/15 rounded-sm shadow-card flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <FileUp size={16} className="text-teal" />
            <h3 className="font-display text-base text-ink">导入批次</h3>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 rounded-sm"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">粘贴批次 JSON（含 samples 与标注）</span>
            <button
              onClick={loadDemo}
              className="inline-flex items-center gap-1 text-xs text-teal border border-teal/30 rounded-sm px-2 py-1 hover:bg-teal-tint"
            >
              <Sparkles size={13} /> 载入示例批次
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "batchNo": "...", "samples": [ ... ] }'
            className="font-mono text-xs bg-paper-100 border border-ink/10 rounded-sm p-3 h-64 resize-none focus:outline-none focus:border-teal/50"
          />

          {localError && (
            <p className="text-xs text-oxblood flex items-center gap-1">
              <AlertTriangle size={13} /> {localError}
            </p>
          )}
          {reusedInfo && (
            <div className="text-xs text-amber2 bg-amber2-tint border border-amber2/30 rounded-sm p-2 flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                检测到相同批次已导入（指纹 <span className="font-mono">{reusedInfo.fingerprint.slice(0, 10)}…</span>），已复用既有结论，未新建冲突记录。正在跳转…
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-ink/10">
          <button
            onClick={onClose}
            className="text-sm text-ink-soft px-3 py-1.5 rounded-sm hover:bg-paper-200"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={!text || importing}
            className="inline-flex items-center gap-1.5 text-sm text-paper-50 bg-teal px-3 py-1.5 rounded-sm hover:bg-teal-soft disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {importing ? '导入中…' : '提交导入'}
          </button>
        </div>
      </div>
    </div>
  );
}
