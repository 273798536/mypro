import { useState } from 'react';
import { FileText, Download, Trash2, Calendar, User, Clock, X, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ReportService } from '../services/reportService';
import { formatPressure, formatNumber } from '../utils/units';
import { FLOW_REGIME_LABELS } from '../utils/constants';
import type { Report } from '../types';

export default function ReportsPage() {
  const { reports, deleteReport, clearReports } = useStore();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const handleExportTXT = (report: Report) => {
    ReportService.downloadTextReport(report.params, report.result);
  };

  const handleExportJSON = (report: Report) => {
    const json = ReportService.exportToJSON(report.params, report.result);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (reports.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">报告中心</h1>
            <p className="text-gray-500 mt-1">查看和管理历史计算报告</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无报告</h3>
            <p className="text-gray-500">
              完成计算并保存方案后，报告会自动生成并保存在这里
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报告中心</h1>
          <p className="text-gray-500 mt-1">
            共 {reports.length} 份报告
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('确定要清空所有报告吗？此操作不可恢复。')) {
              clearReports();
            }
          }}
          className="btn btn-danger"
        >
          <Trash2 className="w-4 h-4" />
          清空报告
        </button>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{report.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(report.exportedAt)}
                        </span>
                        {report.params.source && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {report.params.source}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          v{report.params.version}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg">
                      <span className="text-gray-500">管径：</span>
                      <span className="font-mono text-gray-800">
                        {report.params.diameter} {report.params.diameterUnit}
                      </span>
                    </div>
                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg">
                      <span className="text-gray-500">流量：</span>
                      <span className="font-mono text-gray-800">
                        {report.params.flowRate} {report.params.flowRateUnit}
                      </span>
                    </div>
                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg">
                      <span className="text-gray-500">管长：</span>
                      <span className="font-mono text-gray-800">
                        {report.params.pipeLength} {report.params.pipeLengthUnit}
                      </span>
                    </div>
                    <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                      <span className="text-green-600">压降：</span>
                      <span className="font-mono font-medium text-green-700">
                        {formatPressure(report.result.totalPressureDrop)}
                      </span>
                    </div>
                    <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                      <span className="text-blue-600">流态：</span>
                      <span className="font-medium text-blue-700">
                        {FLOW_REGIME_LABELS[report.result.flowRegime]}
                      </span>
                    </div>
                  </div>

                  {report.result.warnings.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-warning-600">
                      <span className="badge badge-warning">
                        {report.result.warnings.length} 条警告
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="btn btn-secondary !px-3 !py-2"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExportTXT(report)}
                    className="btn btn-secondary !px-3 !py-2"
                    title="导出TXT"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExportJSON(report)}
                    className="btn btn-secondary !px-3 !py-2"
                    title="导出JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定要删除这份报告吗？')) {
                        deleteReport(report.id);
                      }
                    }}
                    className="btn btn-danger !px-3 !py-2"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{selectedReport.title}</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">输入参数</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-gray-600">方案名称</span>
                      <span className="font-medium">{selectedReport.params.name}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-gray-600">数据来源</span>
                      <span className="font-medium">{selectedReport.params.source || '-'}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-gray-600">管径</span>
                      <span className="font-mono">{selectedReport.params.diameter} {selectedReport.params.diameterUnit}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-gray-600">流量</span>
                      <span className="font-mono">{selectedReport.params.flowRate} {selectedReport.params.flowRateUnit}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-gray-600">管长</span>
                      <span className="font-mono">{selectedReport.params.pipeLength} {selectedReport.params.pipeLengthUnit}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-gray-600">粗糙度</span>
                      <span className="font-mono">{selectedReport.params.roughness} {selectedReport.params.roughnessUnit}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-3 py-2 rounded col-span-2">
                      <span className="text-gray-600">流体</span>
                      <span className="font-medium">{selectedReport.params.fluid.name}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">计算结果</h3>
                  <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl p-6">
                    <div className="text-4xl font-bold font-mono mb-2">
                      {formatPressure(selectedReport.result.totalPressureDrop)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <div className="opacity-70">流速</div>
                        <div className="font-mono font-medium">{formatNumber(selectedReport.result.velocity, 3)} m/s</div>
                      </div>
                      <div>
                        <div className="opacity-70">雷诺数</div>
                        <div className="font-mono font-medium">{formatNumber(selectedReport.result.reynolds, 0)}</div>
                      </div>
                      <div>
                        <div className="opacity-70">流态</div>
                        <div className="font-medium">{FLOW_REGIME_LABELS[selectedReport.result.flowRegime]}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedReport.result.warnings.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">警告信息</h3>
                    <div className="space-y-2">
                      {selectedReport.result.warnings.map((warning, i) => (
                        <div key={i} className="p-3 bg-warning-50 border border-warning-200 rounded-lg text-sm">
                          <p className="font-medium text-warning-800">{warning.message}</p>
                          <p className="text-warning-600 mt-1">{warning.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">结果解释</h3>
                  <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {selectedReport.result.explanation}
                  </pre>
                </div>

                {selectedReport.params.editHistory.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">修正历史</h3>
                    <div className="space-y-3">
                      {selectedReport.params.editHistory.map((record, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-gray-800">{record.field}</span>
                              <span className="mx-2 text-gray-400">→</span>
                              <span className="font-mono text-primary-600">
                                {String(record.oldValue)} → {String(record.newValue)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDate(record.timestamp)}
                            </span>
                          </div>
                          {record.reason && (
                            <p className="text-gray-500 mt-1">原因：{record.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => handleExportTXT(selectedReport)} className="btn btn-primary">
                <Download className="w-4 h-4" />
                导出TXT
              </button>
              <button onClick={() => setSelectedReport(null)} className="btn btn-secondary">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
