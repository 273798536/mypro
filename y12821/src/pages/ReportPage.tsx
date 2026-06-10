import React, { useState, useMemo } from 'react';
import {
  FileBarChart,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  MapPin,
  FlaskConical,
  Calendar,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useSampleStore } from '../store/useSampleStore';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import { SampleStatus, STATUS_LABELS } from '../../shared/types';

const RUN_TYPE_LABELS: Record<string, string> = {
  initial: '初始运行',
  rerun: '重复运行',
  supplement: '补录后运行',
};

export const ReportPage: React.FC = () => {
  const { statSnapshots, samples } = useSampleStore();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    statSnapshots[0]?.id || null
  );
  const [compareSnapshotId, setCompareSnapshotId] = useState<string | null>(
    statSnapshots[1]?.id || null
  );
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('csv');
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  const selectedSnapshot = useMemo(
    () => statSnapshots.find((s) => s.id === selectedSnapshotId),
    [statSnapshots, selectedSnapshotId]
  );

  const compareSnapshot = useMemo(
    () => statSnapshots.find((s) => s.id === compareSnapshotId),
    [statSnapshots, compareSnapshotId]
  );

  const getStatusColor = (status: SampleStatus) => {
    switch (status) {
      case 'normal':
        return 'bg-emerald-500';
      case 'borderline':
        return 'bg-amber-500';
      case 'contaminated':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getDiffIcon = (oldVal: number, newVal: number) => {
    if (newVal > oldVal) {
      return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    } else if (newVal < oldVal) {
      return <TrendingDown className="w-4 h-4 text-rose-600" />;
    }
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getDiffClass = (oldVal: number, newVal: number) => {
    if (newVal > oldVal) {
      return 'text-emerald-600 bg-emerald-50';
    } else if (newVal < oldVal) {
      return 'text-rose-600 bg-rose-50';
    }
    return 'text-slate-600';
  };

  const exportReport = () => {
    if (!selectedSnapshot) return;

    const headers = ['分组', '分类', '数量'];
    const rows: string[][] = [];

    rows.push(['按采样地点', '', '']);
    Object.entries(selectedSnapshot.statsData.byLocation).forEach(([location, counts]) => {
      Object.entries(counts).forEach(([status, count]) => {
        rows.push([location, STATUS_LABELS[status as SampleStatus], String(count)]);
      });
    });

    rows.push(['', '', '']);
    rows.push(['按菌株类型', '', '']);
    Object.entries(selectedSnapshot.statsData.byStrainType).forEach(([type, counts]) => {
      Object.entries(counts).forEach(([status, count]) => {
        rows.push([type, STATUS_LABELS[status as SampleStatus], String(count)]);
      });
    });

    rows.push(['', '', '']);
    rows.push(['总计', '', '']);
    Object.entries(selectedSnapshot.statsData.total).forEach(([status, count]) => {
      rows.push(['合计', STATUS_LABELS[status as SampleStatus], String(count)]);
    });

    if (compareSnapshot) {
      rows.push(['', '', '']);
      rows.push(['对比分析', '', '']);
      rows.push(['分组', '变化', '差值']);
      Object.entries(selectedSnapshot.statsData.total).forEach(([status, newVal]) => {
        const oldVal = compareSnapshot.statsData.total[status as SampleStatus] || 0;
        const diff = newVal - oldVal;
        rows.push([
          STATUS_LABELS[status as SampleStatus],
          diff > 0 ? '增加' : diff < 0 ? '减少' : '不变',
          String(Math.abs(diff)),
        ]);
      });
    }

    let content = '';
    if (exportFormat === 'csv') {
      content = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `菌株保藏报告_${selectedSnapshot.batchNumber}_${formatDate(selectedSnapshot.snapshotTime)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            ${[headers, ...rows].map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </table>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `菌株保藏报告_${selectedSnapshot.batchNumber}_${formatDate(selectedSnapshot.snapshotTime)}.xls`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderStatComparison = (
    title: string,
    icon: React.ReactNode,
    data: Record<string, Record<SampleStatus, number>>,
    compareData?: Record<string, Record<SampleStatus, number>>
  ) => {
    const groups = Object.keys(data);
    const statuses: SampleStatus[] = ['normal', 'borderline', 'contaminated', 'pending'];

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            {icon}
            {title}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  分组
                </th>
                {statuses.map((status) => (
                  <th
                    key={status}
                    className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${getStatusColor(
                          status
                        )}`}
                      />
                      {STATUS_LABELS[status]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {groups.map((group) => {
                const hasDiff = compareData && 
                  statuses.some((s) => data[group][s] !== (compareData[group]?.[s] || 0));
                
                if (showDiffOnly && !hasDiff) return null;

                return (
                  <tr key={group} className={hasDiff ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {group}
                    </td>
                    {statuses.map((status) => {
                      const current = data[group][status];
                      const previous = compareData?.[group]?.[status] || 0;
                      const diff = current - previous;

                      return (
                        <td
                          key={status}
                          className={`px-4 py-3 text-center text-sm ${
                            compareData ? getDiffClass(previous, current) : 'text-slate-600'
                          }`}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            {compareData && getDiffIcon(previous, current)}
                            <span className="font-medium">{current}</span>
                            {compareData && diff !== 0 && (
                              <span className="text-xs">
                                ({diff > 0 ? '+' : ''}{diff})
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6" />
            报告导出
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            查看分组统计对比，导出包含前后差别的报告
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">导出格式：</span>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                onClick={() => setExportFormat('csv')}
                className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  exportFormat === 'csv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => setExportFormat('excel')}
                className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  exportFormat === 'excel'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>
          <button
            onClick={exportReport}
            disabled={!selectedSnapshot}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            当前统计快照
          </label>
          <select
            value={selectedSnapshotId || ''}
            onChange={(e) => setSelectedSnapshotId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statSnapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.batchNumber} - {RUN_TYPE_LABELS[snapshot.runType]} ({formatDateTime(snapshot.snapshotTime)})
              </option>
            ))}
          </select>
          {selectedSnapshot && (
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateTime(selectedSnapshot.snapshotTime)}
              </span>
              <span>操作人：{selectedSnapshot.operator}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            对比历史快照（可选）
          </label>
          <select
            value={compareSnapshotId || ''}
            onChange={(e) => setCompareSnapshotId(e.target.value || null)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">不进行对比</option>
            {statSnapshots
              .filter((s) => s.id !== selectedSnapshotId)
              .map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.batchNumber} - {RUN_TYPE_LABELS[snapshot.runType]} ({formatDateTime(snapshot.snapshotTime)})
                </option>
              ))}
          </select>
          {compareSnapshot && (
            <div className="mt-3 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDiffOnly}
                  onChange={(e) => setShowDiffOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                仅显示有变化的分组
              </label>
            </div>
          )}
        </div>
      </div>

      {compareSnapshot && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-800">对比分析模式</h3>
              <p className="text-xs text-blue-600 mt-0.5">
                正在对比 <span className="font-medium">{formatDateTime(selectedSnapshot?.snapshotTime || '')}</span>{' '}
                与 <span className="font-medium">{formatDateTime(compareSnapshot.snapshotTime)}</span>{' '}
                的统计数据差异
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">增加</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="text-rose-700">减少</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">不变</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSnapshot && (
        <div className="space-y-6">
          {renderStatComparison(
            '按采样地点统计',
            <MapPin className="w-4 h-4" />,
            selectedSnapshot.statsData.byLocation,
            compareSnapshot?.statsData.byLocation
          )}

          {renderStatComparison(
            '按菌株类型统计',
            <FlaskConical className="w-4 h-4" />,
            selectedSnapshot.statsData.byStrainType,
            compareSnapshot?.statsData.byStrainType
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                总体统计
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                {(['normal', 'borderline', 'contaminated', 'pending'] as SampleStatus[]).map(
                  (status) => {
                    const current = selectedSnapshot.statsData.total[status];
                    const previous = compareSnapshot?.statsData.total[status] || 0;
                    const diff = current - previous;

                    return (
                      <div
                        key={status}
                        className={`p-5 rounded-xl border-2 ${
                          compareSnapshot && diff !== 0
                            ? diff > 0
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-rose-200 bg-rose-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              status === 'normal'
                                ? 'bg-emerald-100 text-emerald-700'
                                : status === 'borderline'
                                ? 'bg-amber-100 text-amber-700'
                                : status === 'contaminated'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${getStatusColor(
                                status
                              )}`}
                            />
                            {STATUS_LABELS[status]}
                          </span>
                          {compareSnapshot && diff !== 0 && (
                            <span
                              className={`text-sm font-medium ${
                                diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {diff > 0 ? '+' : ''}
                              {diff}
                            </span>
                          )}
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{current}</p>
                        {compareSnapshot && (
                          <p className="text-xs text-slate-500 mt-1">
                            上次：{previous}
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-700 mb-3">样本总数分布</h4>
                <div className="h-8 rounded-lg overflow-hidden flex">
                  {(['normal', 'borderline', 'contaminated', 'pending'] as SampleStatus[]).map(
                    (status) => {
                      const total = Object.values(selectedSnapshot.statsData.total).reduce(
                        (a, b) => a + b,
                        0
                      );
                      const count = selectedSnapshot.statsData.total[status];
                      const percent = total > 0 ? (count / total) * 100 : 0;

                      return (
                        <div
                          key={status}
                          className={`h-full ${getStatusColor(status)} transition-all`}
                          style={{ width: `${percent}%` }}
                          title={`${STATUS_LABELS[status]}: ${count} (${percent.toFixed(1)}%)`}
                        />
                      );
                    }
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  {(['normal', 'borderline', 'contaminated', 'pending'] as SampleStatus[]).map(
                    (status) => {
                      const total = Object.values(selectedSnapshot.statsData.total).reduce(
                        (a, b) => a + b,
                        0
                      );
                      const count = selectedSnapshot.statsData.total[status];
                      const percent = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <span key={status}>
                          {STATUS_LABELS[status]}: {percent.toFixed(1)}%
                        </span>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">历史快照记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  批次号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  运行类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作人
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  生成时间
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  样本数
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {statSnapshots.map((snapshot) => {
                const total = Object.values(snapshot.statsData.total).reduce(
                  (a, b) => a + b,
                  0
                );
                return (
                  <tr key={snapshot.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {snapshot.batchNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          snapshot.runType === 'initial'
                            ? 'bg-blue-100 text-blue-700'
                            : snapshot.runType === 'rerun'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        {RUN_TYPE_LABELS[snapshot.runType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {snapshot.operator}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDateTime(snapshot.snapshotTime)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
