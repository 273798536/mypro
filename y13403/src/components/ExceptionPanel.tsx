import { useApp } from '@/lib/store';
import { useState, useMemo } from 'react';
import { StatusBadge, ResultBadge } from './Badges';
import type { RecordStatus, BoundaryResult } from '@shared/types';
import { STATUS_LABEL, RESULT_LABEL } from '@shared/types';
import { GitCompare, Save, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_OPTIONS: Array<{ value: RecordStatus; label: string }> = [
  { value: 'pending', label: STATUS_LABEL.pending },
  { value: 'confirmed', label: STATUS_LABEL.confirmed },
  { value: 'need_evidence', label: STATUS_LABEL.need_evidence },
  { value: 'manual_overruled', label: STATUS_LABEL.manual_overruled },
  { value: 'revoked', label: STATUS_LABEL.revoked },
];

const RESULT_OPTIONS: Array<{ value: BoundaryResult; label: string }> = [
  { value: 'pass', label: RESULT_LABEL.pass },
  { value: 'fail', label: RESULT_LABEL.fail },
  { value: 'unknown', label: RESULT_LABEL.unknown },
];

function DiffRow({ label, before, after, diff }: { label: string; before: string; after: string; diff: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr_16px_1fr] gap-2 items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={clsx('text-xs font-mono truncate', diff ? 'text-rose-300 line-through' : 'text-zinc-400')}>
        {before || '—'}
      </span>
      <ArrowLeftRight className={clsx('w-3 h-3 mx-auto', diff ? 'text-amber-400' : 'text-zinc-700')} />
      <span className={clsx('text-xs font-mono truncate', diff ? 'text-emerald-300 font-semibold' : 'text-zinc-400')}>
        {after || '—'}
      </span>
    </div>
  );
}

export function ExceptionPanel() {
  const selected = useApp((s) => s.selectedRecord);
  const versions = useApp((s) => s.versions);
  const doUpdate = useApp((s) => s.doUpdate);

  const [status, setStatus] = useState<RecordStatus | ''>('');
  const [result, setResult] = useState<BoundaryResult | ''>('');
  const [remark, setRemark] = useState('');

  const beforeVersion = useMemo(() => {
    if (!selected) return null;
    const list = versions.filter((v) => v.version < selected.currentVersion);
    return list[list.length - 1] || versions[0] || null;
  }, [versions, selected]);

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500 px-6 text-center">
        <GitCompare className="w-7 h-7 opacity-60" />
        <p className="text-xs">选择左侧记录进入异常处理</p>
        <p className="text-[11px]">补说明、改状态、对比改动前版本，顺手得像写便签</p>
      </div>
    );
  }

  const current = {
    status: status || selected.status,
    result: result || selected.boundaryResult,
    remark: remark || selected.remark,
  };

  const diff = {
    status: (status || selected.status) !== (beforeVersion?.status ?? selected.status),
    result: (result || selected.boundaryResult) !== (beforeVersion?.boundaryResult ?? selected.boundaryResult),
    remark: (remark || selected.remark) !== (beforeVersion?.remark ?? selected.remark),
  };

  const anyDiff = diff.status || diff.result || diff.remark;

  const handleSave = () => {
    doUpdate(selected.id, {
      status: status || undefined,
      boundaryResult: result || undefined,
      remark: remark || undefined,
      operator: '阿乔',
    });
    setStatus('');
    setResult('');
    setRemark('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-500/20 flex items-center justify-center">
            <GitCompare className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">异常处理 · 阿乔工作台</h3>
            <p className="text-[11px] text-zinc-500">
              {selected.recordNo} · {selected.paramVersion}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-3 space-y-4">
        {(selected.noMismatch || selected.isLateSubmission) && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 space-y-1">
                {selected.noMismatch && <p>⚠️ 编号格式不符合 TOPO-YYYY-NNNN，需人工确认或修正备注</p>}
                {selected.isLateSubmission && <p>⏰ 该材料为迟到补交，建议在备注中补充来源和时间线</p>}
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">快速修改</p>
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">复核状态</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setStatus(current.status === o.value ? '' : o.value)}
                    className={clsx(
                      'text-[11px] px-2 py-1 rounded border transition',
                      (status || selected.status) === o.value
                        ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-200'
                        : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">边界结论</label>
              <div className="flex flex-wrap gap-1.5">
                {RESULT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setResult(current.result === o.value ? '' : o.value)}
                    className={clsx(
                      'text-[11px] px-2 py-1 rounded border transition',
                      (result || selected.boundaryResult) === o.value
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                        : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">补充说明 / 口头备注</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={selected.remark ? selected.remark : '写点什么，方便明天交接时说清来龙去脉...'}
                rows={3}
                className="w-full px-2.5 py-2 rounded bg-surface-900/70 border border-white/10 text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-indigo-500/40 scroll-thin"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">版本对比 · 改动前 vs 当前</p>
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-2.5">
            <div className="grid grid-cols-[120px_1fr_16px_1fr] gap-2 items-center pb-2 border-b border-white/5 text-[10px] uppercase tracking-widest text-zinc-500">
              <span />
              <span>{beforeVersion ? `改动前 (v${beforeVersion.version})` : '初始版本'}</span>
              <span />
              <span>改动后 (v{selected.currentVersion + (anyDiff ? 1 : 0)})</span>
            </div>
            <DiffRow
              label="状态"
              before={STATUS_LABEL[(beforeVersion?.status ?? selected.status) as RecordStatus]}
              after={STATUS_LABEL[current.status as RecordStatus]}
              diff={diff.status}
            />
            <DiffRow
              label="结论"
              before={RESULT_LABEL[(beforeVersion?.boundaryResult ?? selected.boundaryResult) as BoundaryResult]}
              after={RESULT_LABEL[current.result as BoundaryResult]}
              diff={diff.result}
            />
            <DiffRow
              label="备注"
              before={beforeVersion?.remark ?? selected.remark ?? ''}
              after={current.remark}
              diff={diff.remark}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-1.5 px-1">保存后将生成 v{selected.currentVersion + 1} 版本，计算链路会追加"人工改判覆盖"步骤</p>
        </div>

        {versions.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">改动前那版结论</p>
            <div className="rounded-md border border-white/10 bg-white/[0.02] p-2.5 flex items-center gap-3">
              {beforeVersion ? (
                <>
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={beforeVersion.status} />
                    <ResultBadge result={beforeVersion.boundaryResult} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {beforeVersion.remark ? (
                      <p className="text-[11px] text-zinc-300">{beforeVersion.remark}</p>
                    ) : (
                      <p className="text-[11px] text-zinc-600">（该版本无备注）</p>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-1 font-mono">
                      {beforeVersion.operator} · {new Date(beforeVersion.changedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-zinc-500">这是第一版，暂无更早版本</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/5">
        <button
          onClick={handleSave}
          disabled={!anyDiff}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded bg-indigo-500 text-white hover:bg-indigo-400 transition shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Save className="w-3.5 h-3.5" />
          保存并生成新版本（幂等）
        </button>
      </div>
    </div>
  );
}
