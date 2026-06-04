import { useEffect, useState } from 'react';
import { Download, Calendar, CheckCircle, AlertTriangle, FileSpreadsheet, RefreshCw, Eye } from 'lucide-react';
import { exportApi, recordApi } from '../api/client';
import type { ExportReport, RecordStatus, LoadingRecord } from '../../shared/types';
import { STATUS_LABELS } from '../../shared/types';
import { formatDate, formatDateOnly } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';

export default function Export() {
  const [records, setRecords] = useState<LoadingRecord[]>([]);
  const [report, setReport] = useState<ExportReport | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecordStatus | ''>('');
  const [consistencyCheck, setConsistencyCheck] = useState<{ consistent: boolean; diff: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await recordApi.getRecords();
      setRecords(data);
    } catch (e) {
      console.error('Failed to load records:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setReport(null);
    setFilePath(null);
    setConsistencyCheck(null);

    try {
      const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
      const endTimestamp = endDate ? new Date(endDate).getTime() + 86400000 : undefined;

      const { report: newReport, filePath: newFilePath } = await exportApi.generateReport({
        startDate: startTimestamp,
        endDate: endTimestamp,
        status: statusFilter || undefined,
      });

      setReport(newReport);
      setFilePath(newFilePath);

      const check = await exportApi.verifyConsistency(newReport.records);
      setConsistencyCheck(check);
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (report) {
      exportApi.downloadReport(report.id);
    }
  };

  const filteredRecords = records.filter(r => {
    if (startDate && r.importTime < new Date(startDate).getTime()) return false;
    if (endDate && r.importTime > new Date(endDate).getTime() + 86400000) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const previewStats = {
    total: filteredRecords.length,
    approved: filteredRecords.filter(r => r.status === 'approved').length,
    rejected: filteredRecords.filter(r => r.status === 'rejected').length,
    anomalies: filteredRecords.filter(r => r.status === 'anomaly').length,
    avgScore: filteredRecords.filter(r => r.latestScore !== undefined).length > 0
      ? Math.round(
          filteredRecords.filter(r => r.latestScore !== undefined).reduce((sum, r) => sum + (r.latestScore || 0), 0) /
          filteredRecords.filter(r => r.latestScore !== undefined).length * 100
        ) / 100
      : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-industrial-100 rounded flex items-center justify-center">
            <Download className="w-5 h-5 text-industrial-600" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-semibold text-slate-900">导出复盘</h1>
            <p className="text-sm text-slate-500 mt-1">月底/课前导出审核报告，数据与界面一致性校验</p>
          </div>
        </div>
        <button onClick={loadRecords} className="btn btn-sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            <h2 className="font-mono text-lg font-semibold text-slate-900 mb-4">导出条件</h2>
            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  开始日期
                </label>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  结束日期
                </label>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">状态筛选</label>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RecordStatus | '')}
                >
                  <option value="">全部状态</option>
                  <option value="pending">{STATUS_LABELS.pending}</option>
                  <option value="approved">{STATUS_LABELS.approved}</option>
                  <option value="rejected">{STATUS_LABELS.rejected}</option>
                  <option value="anomaly">{STATUS_LABELS.anomaly}</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn btn-primary w-full"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      生成复盘报告
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-medium text-slate-700 mb-3">界面摘要（预览）</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">总记录数</span>
                <span className="font-mono font-semibold">{previewStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">通过</span>
                <span className="font-mono font-semibold text-emerald-600">{previewStats.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">驳回</span>
                <span className="font-mono font-semibold text-red-600">{previewStats.rejected}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">异常</span>
                <span className="font-mono font-semibold text-amber-600">{previewStats.anomalies}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm text-slate-500">平均分</span>
                <span className="font-mono font-semibold text-industrial-600">{previewStats.avgScore}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {report ? (
            <>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-mono text-lg font-semibold text-slate-900">导出报告</h2>
                  <button onClick={handleDownload} className="btn btn-primary btn-sm">
                    <Download className="w-4 h-4" />
                    下载 Excel
                  </button>
                </div>

                <div className={`p-4 rounded-lg mb-4 ${
                  consistencyCheck?.consistent
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {consistencyCheck?.consistent ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        consistencyCheck?.consistent ? 'text-emerald-800' : 'text-amber-800'
                      }`}>
                        {consistencyCheck?.consistent
                          ? '数据一致性校验通过'
                          : '数据一致性警告'}
                      </p>
                      <p className={`text-sm ${
                        consistencyCheck?.consistent ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {consistencyCheck?.consistent
                          ? '界面展示数据与导出文件内容一致'
                          : `检测到差异：${consistencyCheck?.diff || '请以数据库数据为准'}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <p className="text-2xl font-mono font-bold text-slate-700">{report.totalRecords}</p>
                    <p className="text-xs text-slate-500">总记录</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded">
                    <p className="text-2xl font-mono font-bold text-emerald-600">{report.approved}</p>
                    <p className="text-xs text-slate-500">通过</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <p className="text-2xl font-mono font-bold text-red-600">{report.rejected}</p>
                    <p className="text-xs text-slate-500">驳回</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded">
                    <p className="text-2xl font-mono font-bold text-amber-600">{report.anomalies}</p>
                    <p className="text-xs text-slate-500">异常</p>
                  </div>
                  <div className="text-center p-3 bg-industrial-50 rounded">
                    <p className="text-2xl font-mono font-bold text-industrial-600">{report.averageScore}</p>
                    <p className="text-xs text-slate-500">平均分</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-700">报告明细</h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="btn btn-sm"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? '收起明细' : '展开明细'}
                  </button>
                </div>

                {showPreview && (
                  <div className="max-h-96 overflow-y-auto scrollbar-thin border border-slate-200 rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-slate-600">批次号</th>
                          <th className="text-left p-2 font-medium text-slate-600">月台</th>
                          <th className="text-left p-2 font-medium text-slate-600">车牌</th>
                          <th className="text-left p-2 font-medium text-slate-600">状态</th>
                          <th className="text-left p-2 font-medium text-slate-600">评分</th>
                          <th className="text-left p-2 font-medium text-slate-600">导出状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.records.map((record) => (
                          <tr key={record.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-xs">{record.batchNo}</td>
                            <td className="p-2">{record.platformNo}</td>
                            <td className="p-2">{record.vehicleNo}</td>
                            <td className="p-2">
                              <StatusBadge status={record.status} anomalyType={record.anomalyType} showIcon={false} />
                            </td>
                            <td className="p-2 font-mono">{record.latestScore ?? '-'}</td>
                            <td className="p-2">
                              <span className="text-xs text-emerald-600">将导出</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500">
                  <p>报告周期：{report.period}</p>
                  <p>导出时间：{formatDate(report.exportTime)}</p>
                  <p>文件路径：{filePath}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                {generating ? '正在生成报告...' : '暂无报告'}
              </h3>
              <p className="text-slate-500 mb-4">
                {generating
                  ? '正在处理数据并进行一致性校验...'
                  : '选择时间范围和状态筛选，点击"生成复盘报告"'}
              </p>
              {!generating && (
                <button onClick={handleGenerate} className="btn btn-primary">
                  <FileSpreadsheet className="w-4 h-4" />
                  生成复盘报告
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
