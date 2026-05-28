import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { 
  FileText, Download, X, CheckCircle, AlertCircle, Clock, BarChart3, 
  FileSpreadsheet, FileJson, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  classifyStudentData, calculateWarningStats 
} from '@/utils/errorAnalysis';
import { 
  exportReportToPDF, exportReportToCSV, generateReportData 
} from '@/utils/reportExport';
import { formatDateTime, formatNumber } from '@/utils/helpers';
import { WarningType } from '@/types';

export default function ReportModal() {
  const {
    showReportModal,
    setShowReportModal,
    studentData,
    result,
    params,
    reports,
    addReport,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'untreated' | 'corrected' | 'needsReview' | 'warnings'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const classification = useMemo(() => {
    if (studentData.length === 0) return { untreated: [], corrected: [], needsReview: [] };
    return classifyStudentData(studentData);
  }, [studentData]);

  const warningStats = useMemo(() => {
    if (studentData.length === 0) return { typeStats: {}, total: 0 };
    return calculateWarningStats(studentData);
  }, [studentData]);

  const reportData = useMemo(() => {
    return generateReportData(studentData, params, result, classification, warningStats);
  }, [studentData, params, result, classification, warningStats]);

  const handleGenerateReport = async (format: 'pdf' | 'csv' | 'json') => {
    setIsGenerating(true);
    try {
      if (format === 'pdf') {
        exportReportToPDF(reportData);
      } else if (format === 'csv') {
        exportReportToCSV(reportData);
      } else {
        const dataStr = JSON.stringify(reportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rc-charge-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      addReport(reportData);
    } catch (err) {
      console.error('导出报告失败:', err);
    }
    setIsGenerating(false);
  };

  const handleCopySummary = () => {
    const summary = `
RC充放电实验分析报告 - ${formatDateTime(new Date())}
=======================
学生总数: ${studentData.length}
未处理: ${classification.untreated.length}
已修正: ${classification.corrected.length}
需人工确认: ${classification.needsReview.length}
平均RMSE: ${formatNumber(reportData.summary.avgRmse, 4)} V
平均相关系数: ${formatNumber(reportData.summary.avgCorrelation, 4)}
时间常数: ${formatNumber(reportData.summary.timeConstant, 4)} s
电路参数: R=${params.resistance}${params.resistanceUnit}, C=${params.capacitance}${params.capacitanceUnit}, Vs=${params.sourceVoltage}${params.voltageUnit}
    `.trim();
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!showReportModal) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0F141F] rounded-xl border border-cyan-500/30 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <FileText size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-cyan-400 font-mono font-bold">分析报告</h2>
              <p className="text-[11px] text-gray-500 font-mono">{formatDateTime(new Date())}</p>
            </div>
          </div>
          <button
            onClick={() => setShowReportModal(false)}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-700/50">
          {[
            { key: 'overview', label: '概览', icon: BarChart3, count: studentData.length },
            { key: 'untreated', label: '未处理', icon: Clock, count: classification.untreated.length },
            { key: 'corrected', label: '已修正', icon: CheckCircle, count: classification.corrected.length },
            { key: 'needsReview', label: '需确认', icon: AlertCircle, count: classification.needsReview.length },
            { key: 'warnings', label: '警告', icon: AlertCircle, count: warningStats.total },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono transition-all ${
                activeTab === key
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 rounded ${
                  key === 'needsReview' ? 'bg-yellow-500/30 text-yellow-400' :
                  key === 'corrected' ? 'bg-green-500/30 text-green-400' :
                  key === 'warnings' ? 'bg-orange-500/30 text-orange-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-gray-500 text-xs mb-1">学生总数</div>
                  <div className="text-2xl font-mono text-white">{studentData.length}</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-gray-500 text-xs mb-1">平均RMSE</div>
                  <div className="text-2xl font-mono text-cyan-400">
                    {formatNumber(reportData.summary.avgRmse, 4)}
                  </div>
                  <div className="text-[10px] text-gray-600">V</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-gray-500 text-xs mb-1">平均相关系数</div>
                  <div className="text-2xl font-mono text-green-400">
                    {formatNumber(reportData.summary.avgCorrelation, 4)}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-gray-500 text-xs mb-1">时间常数 τ</div>
                  <div className="text-2xl font-mono text-orange-400">
                    {formatNumber(reportData.summary.timeConstant, 4)}
                  </div>
                  <div className="text-[10px] text-gray-600">s</div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-mono text-gray-300">分类统计</h3>
                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? '已复制' : '复制摘要'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} className="text-blue-400" />
                      <span className="text-xs text-blue-400 font-mono">未处理</span>
                    </div>
                    <div className="text-3xl font-mono text-white">{classification.untreated.length}</div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      占比 {((classification.untreated.length / (studentData.length || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="text-xs text-green-400 font-mono">已修正</span>
                    </div>
                    <div className="text-3xl font-mono text-white">{classification.corrected.length}</div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      占比 {((classification.corrected.length / (studentData.length || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} className="text-yellow-400" />
                      <span className="text-xs text-yellow-400 font-mono">需人工确认</span>
                    </div>
                    <div className="text-3xl font-mono text-white">{classification.needsReview.length}</div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      占比 {((classification.needsReview.length / (studentData.length || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h3 className="text-sm font-mono text-gray-300 mb-3">警告类型分布</h3>
                <div className="space-y-2">
                  {Object.entries(warningStats.typeStats).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-40 font-mono">{type}</span>
                      <div className="flex-1 h-4 bg-gray-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                          style={{ width: `${(count / (warningStats.total || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-orange-400 font-mono w-12 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {reports.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <h3 className="text-sm font-mono text-gray-300 mb-3">历史报告</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {reports.slice(-5).reverse().map((report, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
                        <div>
                          <div className="text-xs text-gray-300 font-mono">{report.title}</div>
                          <div className="text-[10px] text-gray-600">{formatDateTime(report.generatedAt)}</div>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {report.studentCount}人 · RMSE {formatNumber(report.summary.avgRmse, 4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'untreated' && (
            <div className="space-y-2">
              {classification.untreated.length > 0 ? (
                classification.untreated.map(student => (
                  <div key={student.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-300 font-mono">{student.studentName}</span>
                        <span className="text-[10px] text-gray-600 ml-2 font-mono">{student.studentId}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        RMSE: {student.errorAnalysis ? formatNumber(student.errorAnalysis.rmse, 4) : 'N/A'} V
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1 font-mono">
                      导入: {formatDateTime(student.importedAt)} · 来源: {student.source}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600 text-xs">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                  没有未处理的数据
                </div>
              )}
            </div>
          )}

          {activeTab === 'corrected' && (
            <div className="space-y-2">
              {classification.corrected.length > 0 ? (
                classification.corrected.map(student => (
                  <div key={student.id} className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-300 font-mono">{student.studentName}</span>
                        <span className="text-[10px] text-gray-600 ml-2 font-mono">{student.studentId}</span>
                        <span className="text-[10px] text-green-400 ml-2">v{student.corrections.length}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        RMSE: {formatNumber(student.errorAnalysis?.rmse || 0, 4)} V
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1 font-mono">
                      最后修正: {student.corrections.length > 0 ? formatDateTime(student.corrections[student.corrections.length - 1].timestamp) : 'N/A'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600 text-xs">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                  没有已修正的数据
                </div>
              )}
            </div>
          )}

          {activeTab === 'needsReview' && (
            <div className="space-y-2">
              {classification.needsReview.length > 0 ? (
                classification.needsReview.map(student => (
                  <div key={student.id} className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm text-gray-300 font-mono">{student.studentName}</span>
                        <span className="text-[10px] text-gray-600 ml-2 font-mono">{student.studentId}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        RMSE: {formatNumber(student.errorAnalysis?.rmse || 0, 4)} V
                      </div>
                    </div>
                    <div className="space-y-1">
                      {student.warnings.map(w => (
                        <div key={w.id} className="text-[10px] text-yellow-400 font-mono pl-2 border-l-2 border-yellow-500/30">
                          ⚠️ {w.message}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600 text-xs">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                  没有需要人工确认的数据
                </div>
              )}
            </div>
          )}

          {activeTab === 'warnings' && (
            <div className="space-y-2">
              {Object.entries(warningStats.typeStats).length > 0 ? (
                Object.entries(warningStats.typeStats).map(([type, count]) => (
                  <div key={type} className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-400 font-mono">{type}</span>
                      <span className="text-xs text-orange-400 font-mono">{count} 次</span>
                    </div>
                    <div className="mt-2">
                      {studentData
                        .filter(s => s.warnings.some(w => w.type === type as WarningType))
                        .slice(0, 5)
                        .map(student => (
                          <div key={student.id} className="text-[10px] text-gray-400 font-mono py-0.5">
                            • {student.studentName} ({student.studentId})
                          </div>
                        ))}
                      {studentData.filter(s => s.warnings.some(w => w.type === type as WarningType)).length > 5 && (
                        <div className="text-[10px] text-gray-600 font-mono">
                          ...还有 {studentData.filter(s => s.warnings.some(w => w.type === type as WarningType)).length - 5} 人
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600 text-xs">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                  没有警告信息
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700/50">
          <button
            onClick={() => setShowReportModal(false)}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={() => handleGenerateReport('json')}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <FileJson size={14} />
            JSON
          </button>
          <button
            onClick={() => handleGenerateReport('csv')}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={14} />
            CSV
          </button>
          <button
            onClick={() => handleGenerateReport('pdf')}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-sm hover:from-cyan-400 hover:to-blue-400 transition-colors disabled:opacity-50 font-mono"
          >
            <Download size={14} />
            {isGenerating ? '生成中...' : '导出PDF'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
