import React from 'react';
import { FileText, CheckCircle, AlertCircle, Clock, Wrench, Download } from 'lucide-react';
import { useRLCStore } from '../store/useRLCStore';
import { RecordStatus } from '../types';

const statusConfig: Record<RecordStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  unprocessed: {
    label: '未处理',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  auto_corrected: {
    label: '已自动修正',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    icon: <Wrench className="w-4 h-4" />,
  },
  manual_confirm: {
    label: '需人工确认',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    icon: <Clock className="w-4 h-4" />,
  },
  completed: {
    label: '已完成',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: <CheckCircle className="w-4 h-4" />,
  },
};

export const ReportPanel: React.FC = () => {
  const { report } = useRLCStore();

  const handleExportReport = () => {
    if (!report) return;

    const content = `# RLC 电路暂态响应分析报告

生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}

## 统计概览

| 状态 | 数量 |
|------|------|
| 总记录数 | ${report.summary.totalRecords} |
| 未处理 | ${report.summary.unprocessed} |
| 已自动修正 | ${report.summary.autoCorrected} |
| 需人工确认 | ${report.summary.needManualConfirm} |
| 已完成 | ${report.summary.completed} |

## 详细记录

${report.records.map((record, index) => `
### 记录 ${index + 1}
- 时间: ${new Date(record.timestamp).toLocaleString('zh-CN')}
- 状态: ${statusConfig[record.status].label}
- 阻尼类型: ${record.dampingType || '未计算'}
- 过冲: ${record.overshoot > 0 ? `${record.overshoot.toFixed(1)}%` : '无'}
${record.anomalies.length > 0 ? `- 异常: ${record.anomalies.join(', ')}` : ''}
${record.corrections.length > 0 ? `- 修正: ${record.corrections.join('; ')}` : ''}
`).join('')}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rlc-report-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!report) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-cyan-400" />
          分析报告
        </h2>
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">暂无报告数据</p>
          <p className="text-slate-500 text-xs mt-1">完成计算后将生成分析报告</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-cyan-400" />
          分析报告
        </h2>
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          导出报告
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{report.summary.totalRecords}</div>
          <div className="text-xs text-slate-400">总记录</div>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 text-center border border-red-500/20">
          <div className="text-2xl font-bold text-red-400 mb-1">{report.summary.unprocessed}</div>
          <div className="text-xs text-red-400/80">未处理</div>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4 text-center border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-400 mb-1">{report.summary.autoCorrected}</div>
          <div className="text-xs text-blue-400/80">已修正</div>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-4 text-center border border-amber-500/20">
          <div className="text-2xl font-bold text-amber-400 mb-1">{report.summary.needManualConfirm}</div>
          <div className="text-xs text-amber-400/80">待确认</div>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
          <div className="text-2xl font-bold text-green-400 mb-1">{report.summary.completed}</div>
          <div className="text-xs text-green-400/80">已完成</div>
        </div>
      </div>

      <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden mb-6">
        <div className="h-full flex">
          {report.summary.unprocessed > 0 && (
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${(report.summary.unprocessed / report.summary.totalRecords) * 100}%` }}
            />
          )}
          {report.summary.autoCorrected > 0 && (
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${(report.summary.autoCorrected / report.summary.totalRecords) * 100}%` }}
            />
          )}
          {report.summary.needManualConfirm > 0 && (
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${(report.summary.needManualConfirm / report.summary.totalRecords) * 100}%` }}
            />
          )}
          {report.summary.completed > 0 && (
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(report.summary.completed / report.summary.totalRecords) * 100}%` }}
            />
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {report.records.slice(0, 5).map((record) => (
          <div
            key={record.parameterId}
            className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className={`${statusConfig[record.status].color}`}>
                {statusConfig[record.status].icon}
              </span>
              <div>
                <div className="text-sm text-slate-300">
                  {new Date(record.timestamp).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {record.anomalies.length > 0 && (
                  <div className="text-xs text-slate-500 truncate max-w-xs">
                    {record.anomalies[0]}
                  </div>
                )}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs ${statusConfig[record.status].bg} ${statusConfig[record.status].color}`}>
              {statusConfig[record.status].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
