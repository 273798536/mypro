import React, { useState } from 'react';
import { FlaskConical, Download, RotateCcw, ShieldCheck, FileText } from 'lucide-react';
import { useReportStore } from '../store/useReportStore';
import { ExportModal } from './ExportModal';

export const Header: React.FC = () => {
  const resetToMock = useReportStore((s) => s.resetToMock);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white shadow-card">
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight leading-none">
                催化反应选择性报告
              </h1>
              <p className="text-xs text-brand-200 mt-1 font-mono flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                统一数据源 · 自动校验 · 动态复测建议 · 批次追踪
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 border border-white/15 transition-all duration-200"
              title="重置为示例数据"
            >
              <RotateCcw className="w-4 h-4" />
              重置样例
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-brand-800 hover:bg-brand-50 shadow-soft active:translate-y-[1px] transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              导出报告
              <span className="text-xs text-brand-600 font-medium bg-brand-100 px-2 py-0.5 rounded-full ml-1">
                XLSX / PDF
              </span>
            </button>
          </div>
        </div>
      </div>

      {confirmReset && (
        <div className="border-t border-white/10 bg-brand-950/40">
          <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-brand-100 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              确认将所有数据重置为 3 条默认样例（顺利 / 待确认 / 坏数据）？
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10"
              >
                取消
              </button>
              <button
                onClick={() => {
                  resetToMock();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-status-failed text-white hover:bg-rose-600"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </header>
  );
};
