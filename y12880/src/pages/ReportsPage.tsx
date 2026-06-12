import { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Plus,
  Clock,
  Link,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  File as FileIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import type { ReportDetail, ReportListItem } from '@/types';

export default function ReportsPage() {
  const { currentBatchId } = useAppStore();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReports();
      setReports(res.items);
      if (res.items.length > 0) {
        loadReportDetail(res.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetail = async (id: string) => {
    try {
      const detail = await api.getReport(id);
      setSelectedReport(detail);
    } catch (e) {
      console.error('Failed to load report', e);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.generateReport({
        batchId: currentBatchId,
        format,
      });
      if (res.success) {
        await loadReports();
        loadReportDetail(res.reportId);
      }
    } catch (e) {
      alert('生成报告失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-teal-glow-400" />
            报告导出
          </h1>
          <p className="text-sm text-ocean-200/50 mt-1">
            带溯源链接的点检报告，结论回链原始数据记录
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded bg-ocean-700 p-0.5">
            <button
              onClick={() => setFormat('pdf')}
              className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
                format === 'pdf'
                  ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                  : 'text-ocean-200/60 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => setFormat('xlsx')}
              className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
                format === 'xlsx'
                  ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                  : 'text-ocean-200/60 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {generating ? '生成中...' : '生成报告'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        <div className="card-ocean rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-teal-glow-500/10">
            <h2 className="text-base font-medium text-white">报告列表</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-ocean-200/40">加载中...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-ocean-200/40">暂无报告</div>
            ) : (
              <div className="divide-y divide-teal-glow-500/5">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => loadReportDetail(report.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedReport?.id === report.id
                        ? 'bg-teal-glow-500/10'
                        : 'hover:bg-ocean-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {report.format === 'pdf' ? (
                        <FileText className="w-5 h-5 text-risk-medium" />
                      ) : (
                        <FileSpreadsheet className="w-5 h-5 text-risk-low" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{report.title}</div>
                        <div className="text-xs text-ocean-200/40 mt-0.5">
                          {report.generatedAt?.slice(0, 16).replace('T', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 card-ocean rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-teal-glow-500/10 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">
              {selectedReport ? selectedReport.title : '报告预览'}
            </h2>
            {selectedReport && (
              <button className="btn-secondary px-3 py-1.5 rounded text-xs flex items-center gap-2">
                <Download className="w-3.5 h-3.5" />
                下载
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selectedReport ? (
              <div className="h-full flex items-center justify-center text-ocean-200/40">
                选择左侧报告查看详情
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-8 min-h-full">
                <div className="text-center mb-8 pb-6 border-b border-teal-glow-500/20">
                  <h1 className="text-xl font-semibold text-white">
                    {selectedReport.title}
                  </h1>
                  <p className="text-sm text-ocean-200/50 mt-2">
                    生成时间：{selectedReport.generatedAt?.slice(0, 19).replace('T', ' ')}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <StatBox label="设备总数" value={selectedReport.summary.totalEquipment} />
                  <StatBox label="高风险" value={selectedReport.summary.highRisk} color="red" />
                  <StatBox label="数据完整度" value={`${selectedReport.summary.dataCompleteness.toFixed(0)}%`} />
                </div>

                <div className="space-y-8">
                  {selectedReport.sections.map((section, sIdx) => (
                    <div key={sIdx}>
                      <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-teal-glow-500 rounded" />
                        {section.title}
                      </h3>
                      <div className="space-y-3 ml-3">
                        {section.items.map((item, iIdx) => (
                          <div
                            key={item.id}
                            className="p-3 rounded bg-ocean-700/30 border border-teal-glow-500/5"
                          >
                            <p className="text-sm text-ocean-100/80">{item.content}</p>
                            {item.sourceRef && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-ocean-200/40">
                                <Link className="w-3 h-3" />
                                <span>
                                  来源：{item.sourceFile || item.sourceRef}
                                  {item.sourceLine ? ` · 第 ${item.sourceLine} 行` : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 pt-6 border-t border-teal-glow-500/20">
                  <div className="p-4 rounded bg-teal-glow-500/5 border border-teal-glow-500/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-teal-glow-400 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-white">溯源说明</div>
                        <p className="text-xs text-ocean-200/50 mt-1">
                          报告中所有结论均可点击溯源至原始数据记录，包含来源文件名、行号、备注等信息。
                          如需进一步核实，请联系海洋老师复核。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const colorClass = color === 'red' ? 'text-risk-high' : 'text-teal-glow-400';

  return (
    <div className="p-4 rounded bg-ocean-700/30 border border-teal-glow-500/10 text-center">
      <div className="text-xs text-ocean-200/50 mb-1">{label}</div>
      <div className={`text-2xl font-mono font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}
