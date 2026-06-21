import React, { useState, useRef } from 'react';
import { Download, FileSpreadsheet, FileText, Image, FileJson, CheckCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { useCalculationStore } from '@/store/calculationStore';
import { getSampleTypeLabel, getBranchResultLabel } from '@/utils/mockData';
import { getBoundaryTypeLabel } from '@/utils/boundaryEngine';
import { cn } from '@/lib/utils';

const ExportPanel: React.FC = () => {
  const { currentResult } = useCalculationStore();
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const showSuccess = (type: string) => {
    setExportSuccess(type);
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const exportToExcel = () => {
    if (!currentResult) return;
    setExporting('excel');

    setTimeout(() => {
      const exportData = currentResult.details.map((row) => ({
        '样例名称': row.sampleName,
        '样例类型': getSampleTypeLabel(row.sampleType),
        '分支结果': getBranchResultLabel(row.branchResult),
        '边界类型': row.boundaryType ? getBoundaryTypeLabel(row.boundaryType) : '-',
        '数值': row.value,
        '操作人': row.operator,
        '时间': row.time.toLocaleString('zh-CN'),
        '备注': row.note,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '复核明细');

      const statsData = currentResult.stats.map((stat) => ({
        '统计项': stat.title,
        '数值': stat.value,
        '变化': stat.change,
        '趋势': stat.trend === 'up' ? '上升' : stat.trend === 'down' ? '下降' : '持平',
      }));
      const ws2 = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws2, '统计数据');

      XLSX.writeFile(wb, `拓扑路径报告_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExporting(null);
      showSuccess('excel');
    }, 500);
  };

  const exportToCSV = () => {
    if (!currentResult) return;
    setExporting('csv');

    setTimeout(() => {
      const headers = ['样例名称', '样例类型', '分支结果', '边界类型', '数值', '操作人', '时间', '备注'];
      const rows = currentResult.details.map((row) => [
        row.sampleName,
        getSampleTypeLabel(row.sampleType),
        getBranchResultLabel(row.branchResult),
        row.boundaryType ? getBoundaryTypeLabel(row.boundaryType) : '-',
        row.value,
        row.operator,
        row.time.toLocaleString('zh-CN'),
        row.note,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `拓扑路径报告_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setExporting(null);
      showSuccess('csv');
    }, 500);
  };

  const exportToJSON = () => {
    if (!currentResult) return;
    setExporting('json');

    setTimeout(() => {
      const exportData = {
        exportTime: new Date().toISOString(),
        filters: currentResult.filters,
        stats: currentResult.stats,
        details: currentResult.details,
        boundaryRecords: currentResult.boundaryRecords,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `拓扑路径报告_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setExporting(null);
      showSuccess('json');
    }, 500);
  };

  const exportScreenshot = async () => {
    if (!reportRef.current) return;
    setExporting('screenshot');

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `拓扑路径报告截图_${new Date().toISOString().split('T')[0]}.png`;
      link.click();

      showSuccess('screenshot');
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const exportButtons = [
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, action: exportToExcel, color: 'from-emerald-500 to-green-600' },
    { id: 'csv', label: 'CSV', icon: FileText, action: exportToCSV, color: 'from-blue-500 to-indigo-600' },
    { id: 'json', label: 'JSON', icon: FileJson, action: exportToJSON, color: 'from-amber-500 to-orange-600' },
    { id: 'screenshot', label: '截图', icon: Image, action: exportScreenshot, color: 'from-purple-500 to-pink-600' },
  ];

  return (
    <div ref={reportRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">导出报告</h3>
              <p className="text-xs text-slate-500">导出当前计算批次的完整数据</p>
            </div>
          </div>
          {exportSuccess && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <span>导出成功</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exportButtons.map((btn) => {
            const Icon = btn.icon;
            const isExporting = exporting === btn.id;
            const isSuccess = exportSuccess === btn.id;

            return (
              <button
                key={btn.id}
                onClick={btn.action}
                disabled={isExporting}
                className={cn(
                  'relative overflow-hidden group rounded-xl p-4 border transition-all duration-300',
                  'hover:shadow-lg hover:-translate-y-0.5',
                  isExporting ? 'opacity-70 cursor-wait' : '',
                  isSuccess ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300'
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br transition-transform duration-300 group-hover:scale-110',
                      btn.color
                    )}
                  >
                    {isExporting ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : isSuccess ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{btn.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Image className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">截图说明</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                除了汇总页截图之外，系统还会在每条异常明细中保留指向原始材料的追溯链接。
                点击导出的文件时，可以完整追溯从原始数据到最终结论的完整证据链，确保复核过程全程可追溯。
              </p>
            </div>
          </div>
        </div>

        {currentResult && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>
              计算批次: <span className="font-mono text-slate-700">{currentResult.id}</span>
            </span>
            <span>
              计算时间: <span className="text-slate-700">{currentResult.calcTime.toLocaleString('zh-CN')}</span>
            </span>
            <span>
              记录数: <span className="text-slate-700">{currentResult.details.length} 条</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;
