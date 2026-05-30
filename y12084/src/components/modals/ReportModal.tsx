import { useAppStore } from '@/store/useAppStore';
import { Report } from '@/types';
import { getConflictTypeLabel, getSeverityLabel, getSeverityColor } from '@/utils/collision';
import { exportReportToPDF, shareReport } from '@/utils/export';
import { X, FileText, Download, Share2, AlertTriangle, Check, Building2, Wind, Calendar } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function ReportModal() {
  const showModal = useAppStore(state => state.showReportModal);
  const buildings = useAppStore(state => state.buildings);
  const conflicts = useAppStore(state => state.conflicts);
  const corridors = useAppStore(state => state.corridors);
  const reports = useAppStore(state => state.reports);
  const { toggleReportModal, generateReport: genReport, saveReport } = useAppStore(state => state.actions);
  const [reportTitle, setReportTitle] = useState(`城市风廊建筑评估报告_${new Date().toISOString().split('T')[0]}`);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  const currentReport = useMemo(() => {
    if (activeTab === 'generate') {
      return genReport(reportTitle);
    }
    return null;
  }, [activeTab, reportTitle, genReport]);

  if (!showModal) return null;

  const handleExportPDF = async () => {
    if (!currentReport) return;
    await exportReportToPDF(currentReport);
    saveReport(currentReport);
  };

  const handleShare = () => {
    if (!currentReport) return;
    const url = shareReport(currentReport);
    navigator.clipboard.writeText(url);
    alert('分享链接已复制到剪贴板！');
    saveReport(currentReport);
  };

  const renderReportContent = (report: Report) => (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-slate-700">
        <h3 className="text-xl font-bold text-white mb-1">{report.title}</h3>
        <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
          <Calendar size={12} />
          生成时间: {new Date(report.generatedAt).toLocaleString('zh-CN')}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-white">{report.summary.totalBuildings}</p>
          <p className="text-xs text-slate-400 mt-1">建筑总数</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-white">{report.summary.totalConflicts}</p>
          <p className="text-xs text-slate-400 mt-1">冲突总数</p>
        </div>
        <div className="p-4 bg-red-500/10 rounded-lg text-center border border-red-500/30">
          <p className="text-2xl font-bold text-red-400">{report.summary.criticalCount}</p>
          <p className="text-xs text-red-400/80 mt-1">严重</p>
        </div>
        <div className="p-4 bg-orange-500/10 rounded-lg text-center border border-orange-500/30">
          <p className="text-2xl font-bold text-orange-400">{report.summary.errorCount}</p>
          <p className="text-xs text-orange-400/80 mt-1">错误</p>
        </div>
        <div className="p-4 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/30">
          <p className="text-2xl font-bold text-yellow-400">{report.summary.warningCount}</p>
          <p className="text-xs text-yellow-400/80 mt-1">警告</p>
        </div>
      </div>

      <div className="p-4 bg-slate-800/50 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Wind size={16} className="text-cyan-400" />
          风廊风向缺口统计
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {report.summary.corridors.map((c, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
              <span className="text-sm text-slate-300">{c.name}</span>
              <span className={`px-2 py-0.5 text-xs rounded ${
                c.gaps > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {c.gaps}处缺口
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-slate-800/50 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          冲突明细
        </h4>
        <div className="space-y-2 max-h-48 overflow-auto">
          {report.conflicts.slice(0, 10).map(conflict => (
            <div
              key={conflict.id}
              className={`flex items-center justify-between p-2 rounded ${
                conflict.resolved ? 'bg-green-500/5' : 'bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="px-1.5 py-0.5 text-xs rounded"
                  style={{ backgroundColor: `${getSeverityColor(conflict.severity)}20`, color: getSeverityColor(conflict.severity) }}
                >
                  {getSeverityLabel(conflict.severity)}
                </span>
                <span className="text-xs text-slate-400">{getConflictTypeLabel(conflict.type)}</span>
              </div>
              <span className="text-sm text-white flex-1 mx-3 truncate">{conflict.description}</span>
              {conflict.resolved ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <AlertTriangle size={14} className="text-yellow-400" />
              )}
            </div>
          ))}
          {report.conflicts.length > 10 && (
            <p className="text-center text-xs text-slate-500 py-2">
              还有 {report.conflicts.length - 10} 条冲突，完整内容请查看导出的PDF
            </p>
          )}
        </div>
      </div>

      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
        <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
          <FileText size={16} />
          风廊高亮口径说明
        </h4>
        <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
          {report.calibrationNote}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              <FileText size={20} className="text-cyan-400" />
              评估报告
            </h2>
            <div className="flex bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('generate')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === 'generate'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                生成报告
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === 'history'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                历史记录 ({reports.length})
              </button>
            </div>
          </div>
          <button
            onClick={() => toggleReportModal(false)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'generate' ? (
            <>
              <div className="mb-6">
                <label className="block text-xs text-slate-400 mb-2">报告标题</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              {currentReport && renderReportContent(currentReport)}
            </>
          ) : (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <FileText size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">暂无历史报告</p>
                  <p className="text-xs">生成并导出报告后将保存在此处</p>
                </div>
              ) : (
                reports.map(report => (
                  <div key={report.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-white">{report.title}</h4>
                        <p className="text-xs text-slate-400">
                          {new Date(report.generatedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <button
                        onClick={() => exportReportToPDF(report)}
                        className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Download size={12} />
                        下载PDF
                      </button>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-slate-400">
                        <Building2 size={10} className="inline mr-1" />
                        {report.summary.totalBuildings} 建筑
                      </span>
                      <span className="text-red-400">
                        <AlertTriangle size={10} className="inline mr-1" />
                        {report.summary.totalConflicts} 冲突
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {activeTab === 'generate' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              报告包含完整的风廊高亮口径说明，可直接分享给同事
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Share2 size={16} />
                复制分享链接
              </button>
              <button
                onClick={handleExportPDF}
                className="px-6 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                导出PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
