import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import { DataSource } from '../types';
import { exportReportExcel, exportReportText } from '../utils/exporter';

interface ReportExporterProps {
  dataSource: DataSource;
}

export const ReportExporter: React.FC<ReportExporterProps> = ({ dataSource }) => {
  const [showPreview, setShowPreview] = useState(false);
  const textReport = exportReportText(dataSource);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">导出分析报告</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            图表、明细、导出均来自同一批数据，确保一致性。学生只读导出报告也能明白为什么被拦。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <span>👁</span> {showPreview ? '隐藏预览' : '文字预览'}
          </button>
          <button
            onClick={() => saveAs(new Blob([textReport], { type: 'text/plain;charset=utf-8' }), `CV分析报告_${dayjs().format('YYYYMMDD_HHmm')}.txt`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <span>📄</span> 导出 TXT
          </button>
          <button
            onClick={() => exportReportExcel(dataSource)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <span>📊</span> 导出 Excel
          </button>
        </div>
      </div>
      {showPreview && (
        <div className="p-4">
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100 font-mono overflow-auto max-h-[500px] scrollbar-thin">
            {textReport}
          </pre>
        </div>
      )}
    </div>
  );
};
