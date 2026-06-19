import { Download, FileJson, FileText, Table, Info, History } from 'lucide-react';
import type { ReportData } from '../types';
import { useDashboardStore } from '../store/useDashboardStore';
import { generateFileName } from '../lib/analysis';

interface ExportPanelProps {
  report: ReportData | null;
}

export default function ExportPanel({ report }: ExportPanelProps) {
  const { exportReport, historyReports } = useDashboardStore();

  const handleExport = (format: 'json' | 'csv' | 'md') => {
    exportReport(format);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            导出分析报告
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            文件名包含运行批次号，可区分本次运行和上次运行结果
          </p>
        </div>
      </div>

      {!report ? (
        <div className="text-center py-8 text-gray-500">
          <Download className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">请先运行分析生成报告</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-3">当前运行批次</p>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <code className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded border">
                  {report.runId}
                </code>
                <span className="text-xs text-gray-500">
                  {formatDate(report.generatedAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleExport('json')}
                  disabled={!report}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileJson className="w-4 h-4" />
                  <span className="text-sm font-medium">JSON 格式</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={!report}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Table className="w-4 h-4" />
                  <span className="text-sm font-medium">CSV 格式</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  disabled={!report}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Markdown 报告</span>
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">文件名示例：</span>
                  <code className="bg-white px-1.5 py-0.5 rounded text-xs ml-1">
                    {generateFileName(report.runId, 'md')}
                  </code>
                </p>
              </div>
            </div>
          </div>

          {historyReports.length > 1 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                历史运行记录（共 {historyReports.length} 次）
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                  <div>运行批次</div>
                  <div>生成时间</div>
                  <div>慢查询数</div>
                  <div>索引失效</div>
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {[...historyReports].reverse().map((hr) => (
                    <div
                      key={hr.runId}
                      className={`grid grid-cols-4 gap-2 px-4 py-2 text-xs ${
                        hr.runId === report.runId
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-mono text-gray-600 truncate">
                        {hr.runId === report.runId && (
                          <span className="text-blue-600 mr-1">●</span>
                        )}
                        {hr.runId.slice(-8)}
                      </div>
                      <div className="text-gray-500">{formatDate(hr.timestamp)}</div>
                      <div className="text-gray-600">{hr.report.slowQueryCount} 条</div>
                      <div className="text-red-600 font-medium">{hr.report.indexFailureCount} 条</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-900 flex items-center gap-1.5 mb-2">
              <Info className="w-4 h-4" />
              导出文件说明
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <span className="font-medium">文件名规则</span>：主从切换记录台_日期_运行批次号.格式</li>
              <li>• <span className="font-medium">区分运行</span>：每次运行生成唯一批次号，可通过文件名和文件内 runId 字段区分</li>
              <li>• <span className="font-medium">JSON 格式</span>：包含完整的结构化数据，便于程序处理</li>
              <li>• <span className="font-medium">CSV 格式</span>：包含索引失效明细、不可用记录、备份校验异常，可用 Excel 打开</li>
              <li>• <span className="font-medium">Markdown 报告</span>：图文并茂的完整报告，业务同事可直接阅读，包含索引失效原因分析</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
