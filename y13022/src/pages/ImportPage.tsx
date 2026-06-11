import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Layers3, Upload as UploadIcon, AlertTriangle, FileSpreadsheet, X } from 'lucide-react';
import { useImportStore } from '@/store/useImportStore';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { parseBankFile, rowsToReconciliations, type ParsedRow } from '@/utils/fileParser';
import { formatMoney, formatNumber } from '@/utils/parser';

export default function ImportPage() {
  const nav = useNavigate();
  const importStore = useImportStore();
  const reconStore = useReconciliationStore();
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'skip'>('merge');
  const [dragOver, setDragOver] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    importStore.setFileMeta({ name: file.name, size: file.size });
    importStore.setStage('parsing');
    importStore.setError(null);
    try {
      const rows = await parseBankFile(file);
      importStore.setRows(rows);
      importStore.setStage('preview');
    } catch (e: any) {
      importStore.setError(e?.message || '解析失败');
      importStore.setStage('idle');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const confirmImport = () => {
    const recs = rowsToReconciliations(importStore.rows);
    const res = reconStore.addRecords(recs, mergeStrategy);
    setResultMsg(
      `导入完成：新增 ${res.added} 条，合并补充 ${res.merged} 条，跳过 ${res.skipped} 条（未覆盖历史判断）`
    );
  };

  const resetAll = () => {
    importStore.reset();
    setResultMsg(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700 bg-ink-900/60 px-8 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-amber-gold"
          >
            <ArrowLeft size={15} />
            返回列表
          </button>
          <span className="text-ink-600">|</span>
          <h2 className="font-serif text-lg font-semibold text-ink-100">材料导入</h2>
          {importStore.stage !== 'idle' && importStore.fileMeta && (
            <span className="font-mono-num text-xs text-ink-400">
              {importStore.fileMeta.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {resultMsg ? (
          <div className="mx-auto max-w-2xl rounded-sm border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-400" />
            <div className="mb-4 font-serif text-xl font-semibold text-emerald-300">
              {resultMsg}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 rounded-sm border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-ink-200 hover:border-amber-gold/60 hover:text-amber-gold"
              >
                继续导入
              </button>
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-sm border-2 border-amber-gold bg-amber-gold/10 px-4 py-2 text-sm font-medium text-amber-gold hover:bg-amber-gold/20 hover:shadow-glow-amber"
              >
                前往列表
              </Link>
            </div>
          </div>
        ) : importStore.stage === 'preview' ? (
          <PreviewSection
            rows={importStore.rows}
            mergeStrategy={mergeStrategy}
            setMergeStrategy={setMergeStrategy}
            onConfirm={confirmImport}
            onCancel={resetAll}
          />
        ) : (
          <div className="mx-auto max-w-3xl">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            className={
              'cursor-pointer rounded-sm border-2 border-dashed p-16 text-center transition-all ' +
              (dragOver
                ? 'border-amber-gold bg-amber-gold/5 shadow-glow-amber'
                : 'border-ink-600 hover:border-ink-500 hover:bg-ink-800/60')
            }
          >
            <UploadIcon size={48} className="mx-auto mb-4 text-amber-gold opacity-70" />
            <div className="mb-2 font-serif text-xl font-semibold text-ink-100">
              拖拽银行流水文件到此处
            </div>
            <div className="text-sm text-ink-400">
              支持 CSV  .csv / .xlsx / .xls 格式，系统将自动识别并拆分税费和汇率混列字段</div>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {importStore.error && (
            <div className="mt-6 flex items-center gap-3 rounded-sm border border-rose-500/40 bg-rose-500/5 p-4 text-rose-300">
              <AlertTriangle size={18} />
              <span>解析失败：{importStore.error}</span>
            </div>
          )}

          <div className="mt-8 space-y-3 rounded-sm border border-ink-700 bg-ink-800/60 p-5">
            <h3 className="font-serif text-base font-semibold text-ink-100">字段识别说明</h3>
            <ul className="space-y-1.5 text-sm text-ink-300">
              <li className="flex gap-2">
              <FileSpreadsheet size={14} className="mt-0.5 text-amber-gold" />
                自动识别列名：合约代码 / 交易日期 / 现货价 / 期货价 / 基差 / 金额 / 流水号 / 税费汇率（混列）
              </li>
              <li className="flex gap-2">
                <Layers3 size={14} className="mt-0.5 text-amber-gold" />
                税费汇率混列兼容格式："税费123.45/汇率7.2345"、"TAX:88.5 RATE:7.2" 等
              </li>
              <li className="flex gap-2">
                <AlertTriangle size={14} className="mt-0.5 text-amber-400" />
                识别失败的字段将标记为"待人工确认"，可在详情页手动补录
              </li>
            </ul>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

interface PreviewProps {
  rows: ParsedRow[];
  mergeStrategy: 'merge' | 'skip';
  setMergeStrategy: (s: 'merge' | 'skip') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function PreviewSection({ rows, mergeStrategy, setMergeStrategy, onConfirm, onCancel }: PreviewProps) {
  const warnCount = rows.reduce((n, r) => n + (r.warnings.length ? 1 : 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-ink-700 bg-ink-800/60 p-4">
        <div>
          <div className="font-serif text-base font-semibold text-ink-100">
          解析预览 · 共 {rows.length} 条
          {warnCount > 0 && (
            <span className="ml-3 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
              <AlertTriangle size={12} className="mr-1 inline" />
              {warnCount} 条需人工确认
            </span>
          )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-400">与已有流水号冲突时：</span>
          <div className="flex rounded-sm border border-ink-600 overflow-hidden">
            <button
              onClick={() => setMergeStrategy('merge')}
              className={
                'px-3 py-1.5 text-sm transition ' +
                (mergeStrategy === 'merge'
                  ? 'bg-amber-gold/10 text-amber-gold'
                  : 'bg-ink-800 text-ink-300 hover:bg-ink-700')
              }
            >
              合并补充（推荐）
            </button>
            <button
              onClick={() => setMergeStrategy('skip')}
              className={
                'border-l border-ink-600 px-3 py-1.5 text-sm transition ' +
                (mergeStrategy === 'skip'
                  ? 'bg-amber-gold/10 text-amber-gold'
                  : 'bg-ink-800 text-ink-300 hover:bg-ink-700')
              }
            >
              跳过
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-sm border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-ink-200 hover:border-ink-400 hover:text-ink-100"
          >
            <X size={14} />
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-sm border-2 border-amber-gold bg-amber-gold/10 px-4 py-2 text-sm font-medium text-amber-gold hover:bg-amber-gold/20 hover:shadow-glow-amber"
          >
            <CheckCircle2 size={14} />
            确认导入
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-ink-700">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-ink-800 text-xs uppercase tracking-wider text-ink-300">
            <tr>
              <th className="border-b border-ink-700 px-3 py-2 text-left">合约</th>
              <th className="border-b border-ink-700 px-3 py-2 text-left">日期</th>
              <th className="border-b border-ink-700 px-3 py-2 text-left">原始混列</th>
              <th className="border-b border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-emerald-300">
                ↳ 税费（拆分）
              </th>
              <th className="border-b border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-emerald-300">
                ↳ 汇率（拆分）
              </th>
              <th className="border-b border-ink-700 px-3 py-2 text-left">金额</th>
              <th className="border-b border-ink-700 px-3 py-2 text-left">状态</th>
              <th className="border-b border-ink-700 px-3 py-2 text-left">回款拆分</th>
              <th className="border-b border-ink-700 px-3 py-2 text-left">提示</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 ? 'bg-ink-900/40' : 'bg-ink-900'}>
                <td className="border-b border-ink-800 px-3 py-2 font-mono-num text-ink-100">
                  {r.parsed.contractCode || <span className="text-rose-400">—</span>}
                </td>
                <td className="border-b border-ink-800 px-3 py-2 font-mono-num text-ink-200">
                  {r.parsed.tradeDate}
                </td>
                <td className="border-b border-ink-800 px-3 py-2 font-mono-num text-xs text-ink-400">
                  {r.parsed.rawMixedField || '—'}
                </td>
                <td
                  className={
                    'border-b border-emerald-500/20 bg-emerald-500/5 px-3 py-2 font-mono-num text-ink-200 ' +
                    (r.parsed.taxAmount === null ? 'text-rose-400' : '')
                  }
                >
                  {r.parsed.taxAmount === null ? '待确认' : formatNumber(r.parsed.taxAmount, 2)}
                </td>
                <td
                  className={
                    'border-b border-emerald-500/20 bg-emerald-500/5 px-3 py-2 font-mono-num text-ink-200 ' +
                    (r.parsed.exchangeRate === null ? 'text-rose-400' : '')
                  }
                >
                  {r.parsed.exchangeRate === null ? '待确认' : formatNumber(r.parsed.exchangeRate, 4)}
                </td>
                <td className="border-b border-ink-800 px-3 py-2 font-mono-num text-ink-100">
                  {formatMoney(r.parsed.amount)}
                </td>
                <td className="border-b border-ink-800 px-3 py-2 text-ink-200">
                  {r.parsed.status}
                </td>
                <td className="border-b border-ink-800 px-3 py-2 text-ink-200">
                  {r.parsed.isPaymentSplit ? '是' : '否'}
                </td>
                <td className="border-b border-ink-800 px-3 py-2">
                  {r.warnings.length ? (
                    <span className="text-amber-400">
                      {r.warnings.join('；')}
                    </span>
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
