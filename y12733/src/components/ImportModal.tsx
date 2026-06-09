import { useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2, SkipForward, ArrowRight } from 'lucide-react';
import { useCondProbStore } from '@/store/useCondProbStore';
import { parseCSV, rowsToParams, formatPercent } from '@/utils';
import { CondProbParam } from '@/types';
import { DataStatusBadge } from './StatusBadge';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ImportModal({ open, onClose }: Props) {
  const { importConflicts, prepareImport, resolveConflict, applyImport, clearImport } = useCondProbStore();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<CondProbParam[]>([]);
  const [stage, setStage] = useState<'input' | 'review'>('input');
  const [stats, setStats] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleTextParse = () => {
    const rows = parseCSV(text);
    const params = rowsToParams(rows);
    setParsed(params);
    if (params.length > 0) {
      prepareImport(params);
      setStage('review');
    }
  };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      setText(content);
      const rows = parseCSV(content);
      const params = rowsToParams(rows);
      setParsed(params);
      if (params.length > 0) {
        prepareImport(params);
        setStage('review');
      }
    };
    reader.readAsText(f);
  };

  const handleApply = () => {
    const result = applyImport();
    setStats(result);
  };

  const handleReset = () => {
    clearImport();
    setText('');
    setParsed([]);
    setStage('input');
    setStats(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-ink-100 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink-800">导入参数表 · 防重复校验</h2>
            <p className="text-xs text-ink-500 mt-0.5">
              支持 CSV 粘贴或文件上传。相同「条件+结果」组合会被识别为重复，逐条决定处理方式。
            </p>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {stage === 'input' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-ink-200 rounded-xl p-8 text-center hover:border-ink-400 hover:bg-ink-50/40 transition-all cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto text-ink-400 mb-3" />
                <p className="text-sm font-medium text-ink-700">点击或拖拽上传 CSV 文件</p>
                <p className="text-xs text-ink-400 mt-1">需包含列：condition, outcome, conditionCount, jointCount, status</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
              <div className="text-center text-xs text-ink-400">或直接粘贴 CSV 内容</div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder={`condition,outcome,conditionCount,jointCount,status\n注册满30天,首次付费,400,280,available\n领取优惠券未使用,次月复购,800,12,pending`}
                className="w-full px-3 py-2 rounded-lg border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm font-mono resize-y"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleTextParse}
                  disabled={!text.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-ink-700 hover:bg-ink-800 disabled:bg-ink-300 text-white font-medium shadow-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  解析并校验重复
                </button>
              </div>
            </div>
          )}

          {stage === 'review' && !stats && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-ink-600">
                    共 <b className="font-mono">{parsed.length}</b> 条，
                    发现 <b className="font-mono text-amber-700">{importConflicts.length}</b> 条重复冲突
                  </span>
                </div>
                <button onClick={handleReset} className="text-xs text-ink-500 hover:text-ink-700 underline underline-offset-2">
                  重新选择数据
                </button>
              </div>

              {importConflicts.length === 0 && parsed.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  未发现重复数据，全部 {parsed.length} 条将作为新条目添加（状态为待确认）。
                </div>
              )}

              {importConflicts.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-ink-100">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-50 text-ink-600 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">条件 | 结果</th>
                        <th className="text-left px-3 py-2 font-medium">现有值</th>
                        <th></th>
                        <th className="text-left px-3 py-2 font-medium">导入值</th>
                        <th className="text-left px-3 py-2 font-medium">处理方式</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importConflicts.map((c, idx) => (
                        <tr key={c.existing.id} className="border-t border-ink-50 even:bg-ink-50/30">
                          <td className="px-3 py-2 align-top">
                            <div className="font-serif text-ink-800 text-sm">{c.existing.condition}</div>
                            <div className="text-xs text-ink-500">→ {c.existing.outcome}</div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="font-mono text-rose-700">{formatPercent(c.existing.probability)}</div>
                            <div className="text-[11px] text-ink-400">
                              N(A)={c.existing.conditionCount} · N(∩)={c.existing.jointCount}
                            </div>
                            <div className="mt-1"><DataStatusBadge status={c.existing.status} /></div>
                          </td>
                          <td className="px-1 py-2 align-top text-ink-400"><ArrowRight className="w-4 h-4" /></td>
                          <td className="px-3 py-2 align-top">
                            <div className="font-mono text-emerald-700">{formatPercent(c.incoming.probability)}</div>
                            <div className="text-[11px] text-ink-400">
                              N(A)={c.incoming.conditionCount} · N(∩)={c.incoming.jointCount}
                            </div>
                            <div className="mt-1"><DataStatusBadge status={c.incoming.status} /></div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => resolveConflict(idx, 'overwrite')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                                  c.resolution === 'overwrite'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : 'bg-white border-ink-200 text-ink-600 hover:border-emerald-300'
                                }`}
                              >
                                <ArrowRight className="w-3 h-3" /> 覆盖现有值
                              </button>
                              <button
                                onClick={() => resolveConflict(idx, 'keep')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                                  c.resolution === 'keep'
                                    ? 'bg-ink-700 border-ink-700 text-white'
                                    : 'bg-white border-ink-200 text-ink-600 hover:border-ink-400'
                                }`}
                              >
                                <SkipForward className="w-3 h-3" /> 保留现有
                              </button>
                              <button
                                onClick={() => resolveConflict(idx, 'skip')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                                  c.resolution === 'skip'
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : 'bg-white border-ink-200 text-ink-600 hover:border-amber-300'
                                }`}
                              >
                                <AlertCircle className="w-3 h-3" /> 跳过不导入
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-md text-sm text-ink-600 hover:bg-ink-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-ink-700 hover:bg-ink-800 text-white font-medium shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  确认导入（{parsed.length} 条）
                </button>
              </div>
            </div>
          )}

          {stats && (
            <div className="py-12 text-center animate-fadeIn">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 mb-4" />
              <h3 className="font-serif text-xl font-semibold text-ink-800 mb-2">导入完成</h3>
              <p className="text-sm text-ink-600">
                本次处理 {parsed.length} 条：新增 <b>{stats.added}</b>、覆盖更新 <b className="text-emerald-700">{stats.updated}</b>、跳过 <b className="text-amber-700">{stats.skipped}</b>
              </p>
              <p className="text-xs text-ink-400 mt-1">覆盖操作已自动生成变更留痕，可在参数详情中查看。</p>
              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="mt-6 px-5 py-2 rounded-md text-sm bg-ink-700 hover:bg-ink-800 text-white font-medium"
              >
                完成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
