import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, CheckCircle2, Eye, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useReportStore } from '../store/useReportStore';
import { computeStats, formatDate } from '../utils/validation';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<Props> = ({ open, onClose }) => {
  const batches = useReportStore((s) => s.batches);
  const exportXLSX = useReportStore((s) => s.exportXLSX);
  const exportPDF = useReportStore((s) => s.exportPDF);
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [exporting, setExporting] = useState(false);
  const stats = computeStats(batches);
  const failedBatches = batches.filter((b) => b.blockerReasons && b.blockerReasons.length > 0);

  if (!open) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'xlsx') {
        exportXLSX();
      } else {
          await exportPDF('report-root');
        }
    } finally {
      setTimeout(() => {
        setExporting(false);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-xl card-paper overflow-hidden flex flex-col">
        <div className="p-5 border-b border-paper-200 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-semibold text-brand-800 flex items-center gap-2">
              <Download className="w-5 h-5" />
              导出催化反应选择性报告
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              报告日期：{formatDate(new Date().toISOString())}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              报告预览摘要
            </p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="font-serif text-2xl font-bold text-brand-800">{stats.total}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">总批次</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-status-success">{stats.successCount}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">放行</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-amber-600">{stats.pendingCount}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">待确认</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-status-failed">{stats.failedCount}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">异常</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-3">
              导出格式
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('xlsx')}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  format === 'xlsx'
                    ? 'border-brand-600 bg-brand-50 shadow-soft'
                    : 'border-paper-200 bg-white hover:border-brand-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  {format === 'xlsx' && (
                    <CheckCircle2 className="w-5 h-5 text-brand-600" />
                  )}
                </div>
                <p className="mt-3 font-semibold text-brand-800">Excel (.xlsx)</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  包含 3 个工作表：<br />
                  批次明细 / 拦阻原因 / 追踪记录
                </p>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  format === 'pdf'
                    ? 'border-brand-600 bg-brand-50 shadow-soft'
                    : 'border-paper-200 bg-white hover:border-brand-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                    <FileText className="w-5 h-5" />
                  </div>
                  {format === 'pdf' && (
                    <CheckCircle2 className="w-5 h-5 text-brand-600" />
                  )}
                </div>
                <p className="mt-3 font-semibold text-brand-800">PDF (.pdf)</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  看板全景截图<br />
                  适合直接发给质检主管审阅
                </p>
              </button>
            </div>
          </div>

          {failedBatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-status-failed mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                导出报告中包含的拦阻原因说明
              </p>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-status-failed/20 bg-status-failed/5 divide-y divide-status-failed/10">
                {failedBatches.map((b) => (
                  <div key={b.id} className="p-3">
                    <p className="text-xs font-mono font-semibold text-status-failed mb-1.5">
                      {b.batchNo} · {b.researcher}
                    </p>
                    <ul className="space-y-1">
                      {(b.blockerReasons || []).map((r, i) => (
                        <li
                          key={i}
                          className="text-xs text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-status-failed"
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                    {b.manualNote && (
                      <div className="mt-2 pl-4 border-l-2 border-brand-300 italic text-xs text-gray-600 bg-paper-100/50 py-1.5 pr-2 leading-relaxed">
                        {b.manualNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                * 质检主管即使仅阅读导出报告，也可据此理解拦阻依据
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-paper-200 flex items-center justify-between bg-paper-100/50">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            数据与看板、明细来自统一数据源
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">取消</button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 正在导出...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  确认导出
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
