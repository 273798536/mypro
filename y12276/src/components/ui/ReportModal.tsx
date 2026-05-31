import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getAllConflicts } from '@/utils/conflictDetection';
import {
  generatePlainTextReport,
  generateHtmlReport,
  downloadReport,
} from '@/utils/reportGenerator';
import { formatTime, getSeverityLabel, getSeverityColor } from '@/utils/humanizer';
import { X, Download, FileText, CheckCircle, AlertTriangle, Info, Copy, Check } from 'lucide-react';

export function ReportModal() {
  const { showReportModal, setShowReportModal, screenshots } = useAppStore();
  const [format, setFormat] = useState<'txt' | 'html'>('html');
  const [copied, setCopied] = useState(false);
  const allConflicts = getAllConflicts();

  if (!showReportModal) return null;

  const unresolvedConflicts = allConflicts.filter((c) => !c.resolved);

  const criticalCount = unresolvedConflicts.filter((c) => c.severity === 'critical').length;
  const warningCount = unresolvedConflicts.filter((c) => c.severity === 'warning').length;
  const infoCount = unresolvedConflicts.filter((c) => c.severity === 'info').length;

  const handleGenerate = () => {
    const reportData = {
      conflicts: unresolvedConflicts,
      screenshots,
      generatedAt: Date.now(),
      stageVersion: 'stage_main_v1.0',
    };

    const content =
      format === 'txt'
        ? generatePlainTextReport(reportData)
        : generateHtmlReport(reportData);

    downloadReport(content, `舞台线缆冲突报告_${Date.now()}`, format);
  };

  const handleCopyHumanReadable = () => {
    const summary = generateHumanReadableSummary(unresolvedConflicts);
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700/50 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <FileText className="text-cyan-400" />
              生成检测报告
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              报告将包含所有冲突详情、人话解释和关联截图
            </p>
          </div>
          <button
            onClick={() => setShowReportModal(false)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-center">
              <AlertTriangle className="mx-auto mb-2 text-red-400" size={28} />
              <div className="text-3xl font-bold text-red-400">{criticalCount}</div>
              <div className="text-xs text-red-300/70">严重问题</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-center">
              <AlertTriangle className="mx-auto mb-2 text-yellow-400" size={28} />
              <div className="text-3xl font-bold text-yellow-400">{warningCount}</div>
              <div className="text-xs text-yellow-300/70">警告问题</div>
            </div>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-center">
              <Info className="mx-auto mb-2 text-blue-400" size={28} />
              <div className="text-3xl font-bold text-blue-400">{infoCount}</div>
              <div className="text-xs text-blue-300/70">提示信息</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-300 mb-3 tracking-wider uppercase">
              人话摘要（可复制给非技术同事）
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="space-y-3 mb-4">
                {unresolvedConflicts.slice(0, 3).map((conflict) => (
                  <div
                    key={conflict.id}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: `${getSeverityColor(conflict.severity)}10` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: getSeverityColor(conflict.severity) }}
                    >
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${getSeverityColor(conflict.severity)}30`,
                            color: getSeverityColor(conflict.severity),
                          }}
                        >
                          {getSeverityLabel(conflict.severity)}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {formatTime(conflict.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{conflict.humanReadableDesc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleCopyHumanReadable}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    已复制到剪贴板
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    复制人话摘要
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-300 mb-3 tracking-wider uppercase">
              报告包含内容
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                <CheckCircle className="text-emerald-400 flex-shrink-0" size={18} />
                <span className="text-sm text-slate-300">
                  所有 {unresolvedConflicts.length} 个冲突的技术详情和人话解释
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                <CheckCircle className="text-emerald-400 flex-shrink-0" size={18} />
                <span className="text-sm text-slate-300">
                  {allConflicts.reduce((sum, c) => sum + c.traceRecords.length, 0)} 条留痕记录
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                <CheckCircle className="text-emerald-400 flex-shrink-0" size={18} />
                <span className="text-sm text-slate-300">
                  {screenshots.length} 张关联截图
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                <CheckCircle className="text-emerald-400 flex-shrink-0" size={18} />
                <span className="text-sm text-slate-300">
                  舞台模型、乐手位置、截图的完整对应关系
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3 tracking-wider uppercase">
              选择导出格式
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat('html')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  format === 'html'
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">📄</div>
                <div className={`font-medium ${format === 'html' ? 'text-cyan-400' : 'text-slate-300'}`}>
                  HTML 格式
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  带截图、样式美观、可直接转发
                </div>
              </button>
              <button
                onClick={() => setFormat('txt')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  format === 'txt'
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">📝</div>
                <div className={`font-medium ${format === 'txt' ? 'text-cyan-400' : 'text-slate-300'}`}>
                  纯文本格式
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  体积小、可直接粘贴到聊天
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700/50 flex justify-end gap-3">
          <button
            onClick={() => setShowReportModal(false)}
            className="px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:scale-105"
          >
            <Download size={18} />
            下载报告
          </button>
        </div>
      </div>
    </div>
  );
}

function generateHumanReadableSummary(conflicts: any[]): string {
  const lines: string[] = [];

  lines.push('🎵 舞台线缆冲突检测报告（人话版）');
  lines.push('='.repeat(50));
  lines.push('');

  const critical = conflicts.filter((c) => c.severity === 'critical');
  const warning = conflicts.filter((c) => c.severity === 'warning');
  const info = conflicts.filter((c) => c.severity === 'info');

  lines.push(`📊 共检测到 ${conflicts.length} 个问题：`);
  lines.push(`   🔴 严重：${critical.length} 个`);
  lines.push(`   🟡 警告：${warning.length} 个`);
  lines.push(`   🔵 提示：${info.length} 个`);
  lines.push('');

  if (critical.length > 0) {
    lines.push('🔴 【必须立即处理的严重问题】');
    critical.forEach((c, i) => {
      lines.push(`   ${i + 1}. 第${formatTime(c.timestamp)} - ${c.humanReadableDesc}`);
    });
    lines.push('');
  }

  if (warning.length > 0) {
    lines.push('🟡 【建议处理的警告问题】');
    warning.forEach((c, i) => {
      lines.push(`   ${i + 1}. 第${formatTime(c.timestamp)} - ${c.humanReadableDesc}`);
    });
    lines.push('');
  }

  if (info.length > 0) {
    lines.push('🔵 【可稍后关注的提示】');
    info.forEach((c, i) => {
      lines.push(`   ${i + 1}. 第${formatTime(c.timestamp)} - ${c.humanReadableDesc}`);
    });
    lines.push('');
  }

  lines.push('💡 建议：');
  lines.push('   1. 优先处理🔴严重问题，避免演出事故');
  lines.push('   2. 线缆穿越问题建议重新布线');
  lines.push('   3. 走位冲突请与乐手沟通调整路线');
  lines.push('   4. 调整后请重新检测确认');
  lines.push('');
  lines.push('='.repeat(50));
  lines.push('报告生成时间：' + new Date().toLocaleString('zh-CN'));

  return lines.join('\n');
}
