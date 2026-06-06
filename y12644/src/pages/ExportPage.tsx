import { useMemo, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  FileDown,
  User,
  Clock,
  BarChart3,
  RefreshCcw,
  Palette,
  ClipboardList,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { generateReport, exportToPDF, exportToExcel } from '../utils/exportUtils';
import {
  getStatusLabel,
  getTypeLabel,
  getStatusColor,
} from '../utils/coordinateUtils';

export default function ExportPage() {
  const { records, undoCount } = useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const report = useMemo(() => generateReport(records, undoCount), [records, undoCount]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full overflow-hidden p-6">
      <div className="h-full flex gap-6">
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
          <div className="max-w-4xl mx-auto space-y-6 pb-8">
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">地铁站厅导流贴图 · 复盘报告</h2>
                    <p className="text-sm text-gray-500 mt-0.5">训练员仅看此报告即可理解处理逻辑</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportToPDF(report)} className="btn-primary text-xs">
                    <FileDown className="w-3.5 h-3.5" />
                    导出PDF
                  </button>
                  <button onClick={() => exportToExcel(report)} className="btn-secondary text-xs">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    导出Excel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center p-3 rounded-xl bg-gray-50">
                  <p className="text-2xl font-bold text-gray-800 tabular-nums">{report.totalRecords}</p>
                  <p className="text-xs text-gray-500 mt-0.5">记录总数</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-success-50">
                  <p className="text-2xl font-bold text-success-600 tabular-nums">{report.statusCounts.success}</p>
                  <p className="text-xs text-gray-500 mt-0.5">顺利</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-warning-50">
                  <p className="text-2xl font-bold text-warning-600 tabular-nums">{report.statusCounts.pending}</p>
                  <p className="text-xs text-gray-500 mt-0.5">待确认</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-danger-50">
                  <p className="text-2xl font-bold text-danger-600 tabular-nums">{report.statusCounts.error}</p>
                  <p className="text-xs text-gray-500 mt-0.5">坏数据</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  导出时间：{report.exportTime}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  操作人员：{report.operator}
                </div>
              </div>
            </div>

            {report.flippedRecords.length > 0 && (
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 border-l-4 border-l-accent-500">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-accent-500" />
                  <h3 className="font-semibold text-gray-800">坐标翻转记录（可直接复制给同事）</h3>
                  <span className="status-badge bg-accent-50 text-accent-700 ml-1">
                    {report.flippedRecords.length} 条
                  </span>
                </div>

                <div className="space-y-3">
                  {report.flippedRecords.map((item) => {
                    const color = getStatusColor(item.record.status, item.record.isFlipped);
                    return (
                      <div
                        key={item.record.id}
                        className="border border-gray-100 rounded-xl p-4 bg-accent-50/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-semibold text-gray-800">{item.record.label}</span>
                            <span className="font-mono text-xs text-gray-500">
                              ({item.record.xCoordinate}, {item.record.yCoordinate})
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(item.explanation, item.record.id)}
                            className="btn-ghost text-xs py-1.5 px-2.5"
                          >
                            {copiedId === item.record.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                复制说明
                              </>
                            )}
                          </button>
                        </div>
                        <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {item.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {report.annotations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-5 h-5 text-primary-500" />
                  <h3 className="font-semibold text-gray-800">人工备注（保留原话，未做自动修改）</h3>
                </div>

                <div className="space-y-3">
                  {report.annotations.map((item) => (
                    <div
                      key={item.record.id}
                      className="border border-gray-100 rounded-xl p-4 bg-primary-50/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="status-badge bg-white text-primary-700 text-[10px]">
                          {item.record.label}
                        </span>
                        {item.record.annotation?.author && (
                          <span className="text-xs text-gray-500">
                            {item.record.annotation.author} 备注
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        「{item.originalNote}」
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-gray-800">本轮复核概要</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-primary-500" />
                    <p className="text-sm font-medium text-gray-800">颜色规则</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {report.scoringSummary.colorRules.length} 条规则已复核
                  </p>
                  <div className="space-y-1.5">
                    {report.scoringSummary.colorRules.map((rule) => (
                      <div key={rule.status} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: rule.color }}
                        />
                        <span className="text-gray-600">{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-warning-500" />
                    <p className="text-sm font-medium text-gray-800">评分表</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {report.scoringSummary.scoreTable.length} 条记录评分
                  </p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-thin">
                    {report.scoringSummary.scoreTable.slice(0, 5).map((item) => (
                      <div key={item.recordId} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate max-w-[120px]">{item.label}</span>
                        <span className="text-gray-800 font-semibold tabular-nums">{item.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCcw className="w-4 h-4 text-success-500" />
                    <p className="text-sm font-medium text-gray-800">撤销后状态同步</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    撤销执行 {report.scoringSummary.syncStatusCheck.undoOperationsCount} 次
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {report.scoringSummary.syncStatusCheck.details}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <ClipboardList className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-gray-800">三类样例展示</h3>
                <span className="text-xs text-gray-500 ml-1">顺利/待确认/坏数据各一条，可看出处理功底</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <SampleCard
                  title="顺利记录样例"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  color="#4CAF50"
                  record={report.samples.success[0]}
                />
                <SampleCard
                  title="待确认记录样例"
                  icon={<AlertTriangle className="w-4 h-4" />}
                  color="#FFC107"
                  record={report.samples.pending[0]}
                />
                <SampleCard
                  title="坏数据样例"
                  icon={<XCircle className="w-4 h-4" />}
                  color="#F44336"
                  record={report.samples.error[0]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SampleCard({
  title,
  icon,
  color,
  record,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  record?: any;
}) {
  if (!record) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
        无样例
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-100"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color }}>{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <p className="font-medium text-gray-800">{record.label}</p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
          <span>{getTypeLabel(record.type)}</span>
          <span>·</span>
          <span className="font-mono">({record.xCoordinate}, {record.yCoordinate})</span>
        </div>
        <span
          className="status-badge mt-2"
          style={{ backgroundColor: color + '15', color }}
        >
          {record.isFlipped ? '坐标翻转' : getStatusLabel(record.status)}
        </span>
        {record.annotation && (
          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
            <p className="text-[10px] text-gray-400 mb-1">{record.annotation.author}备注：</p>
            「{record.annotation.content}」
          </div>
        )}
        {record.isFlipped && record.flipExplanation && (
          <div className="mt-3 p-2.5 bg-accent-50 rounded-lg text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
            {record.flipExplanation}
          </div>
        )}
      </div>
    </div>
  );
}
