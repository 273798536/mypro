import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateSummaryText, findDuplicateBatches, getRatingStats } from '../utils/analysis';
import { STATUS_LABELS, RATING_DESCRIPTIONS } from '../types';

type ExportFormat = 'txt' | 'csv' | 'json';

export function ReportExport() {
  const { state } = useApp();
  const [format, setFormat] = useState<ExportFormat>('txt');
  const summaryText = useMemo(() => generateSummaryText(state.records), [state.records]);
  const duplicates = useMemo(() => findDuplicateBatches(state.records), [state.records]);

  const stats = useMemo(() => {
    const total = state.records.length;
    const pass = state.records.filter(r => r.conclusion === 'pass').length;
    const fail = state.records.filter(r => r.conclusion === 'fail').length;
    const pending = state.records.filter(r => r.conclusion === 'pending').length;
    const confirmed = state.records.filter(r => r.conclusion === 'confirmed').length;
    const avgRating = total > 0
      ? (state.records.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
      : '0';
    return { total, pass, fail, pending, confirmed, avgRating, duplicates: duplicates.length };
  }, [state.records, duplicates]);

  const generateCSV = () => {
    const headers = [
      '样品名称', '批号', '试验日期', '时长(h)', '评级', '评级描述',
      '结论', '数据来源', '操作员', '复核人', '复核日期', '关联台账数', '备注'
    ];
    const rows = state.records.map(r => [
      r.sampleName,
      r.batchNo,
      r.testDate,
      r.durationHours,
      r.rating,
      RATING_DESCRIPTIONS[r.rating],
      STATUS_LABELS[r.conclusion],
      r.source,
      r.operator,
      r.reviewedBy || '',
      r.reviewedAt ? r.reviewedAt.split('T')[0] : '',
      r.reagentLedgerIds.length,
      (r.remark || '').replace(/\n/g, ' ')
    ]);
    return '\ufeff' + [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
  };

  const generateJSON = () => {
    return JSON.stringify({
      generatedAt: new Date().toISOString(),
      summary: stats,
      records: state.records,
      duplicates,
      reagents: state.reagents,
      reagentLedgers: state.reagentLedgers
    }, null, 2);
  };

  const handleExport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'csv':
        content = generateCSV();
        filename = `盐雾试验腐蚀评级报告_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv;charset=utf-8';
        break;
      case 'json':
        content = generateJSON();
        filename = `盐雾试验腐蚀评级报告_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json;charset=utf-8';
        break;
      default:
        content = summaryText;
        filename = `盐雾试验腐蚀评级报告_${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain;charset=utf-8';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          报告导出（日常入口）
          <span className="card-subtitle">导出的内容与界面摘要保持一致</span>
        </div>

        <div className="summary-grid">
          <div className="summary-card total">
            <div className="value">{stats.total}</div>
            <div className="label">总记录数</div>
          </div>
          <div className="summary-card pass">
            <div className="value">{stats.pass}</div>
            <div className="label">通过</div>
          </div>
          <div className="summary-card fail">
            <div className="value">{stats.fail}</div>
            <div className="label">不通过</div>
          </div>
          <div className="summary-card pending">
            <div className="value">{stats.pending}</div>
            <div className="label">待确认</div>
          </div>
          <div className="summary-card confirmed">
            <div className="value">{stats.confirmed}</div>
            <div className="label">已确认</div>
          </div>
          <div className="summary-card duplicate">
            <div className="value">{stats.duplicates}</div>
            <div className="label">重复批号</div>
          </div>
        </div>

        {stats.duplicates > 0 && (
          <div className="alert alert-warning">
            <div>
              <strong>⚠ 存在 {stats.duplicates} 个重复批号</strong>
              <p className="text-sm mt-1">
                导出的报告中将包含这些重复记录及其结论冲突提示。建议先到「批号追踪」页面处理合并后再导出正式报告。
              </p>
            </div>
          </div>
        )}

        {stats.pending > 0 && (
          <div className="alert alert-info">
            <div>
              <strong>ℹ 有 {stats.pending} 条记录待确认</strong>
              <p className="text-sm mt-1">
                这些记录在报告中将标记为「待确认」，请由安全员完成复核后结论才会生效。
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4 items-center">
          <span className="text-muted">导出格式：</span>
          <select
            value={format}
            onChange={e => setFormat(e.target.value as ExportFormat)}
            className="btn btn-secondary"
            style={{ padding: '7px 12px' }}
          >
            <option value="txt">文本报告（TXT）</option>
            <option value="csv">表格数据（CSV，可用Excel打开）</option>
            <option value="json">完整数据（JSON，用于数据备份）</option>
          </select>
          <button className="btn btn-primary" onClick={handleExport}>
            📥 导出报告
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          报告预览（文字说明）
          <span className="card-subtitle">与图表、表格数据保持一致</span>
        </div>
        <pre className="pre-section">{summaryText}</pre>
      </div>

      <div className="card">
        <div className="card-title">
          评级分布明细（表格数据）
          <span className="card-subtitle">与上方图表数据一致</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>评级</th>
              <th>描述</th>
              <th>记录数</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            {getRatingStats(state.records).map(row => (
              <tr key={row.rating}>
                <td><strong>{row.rating}级</strong></td>
                <td>{row.description}</td>
                <td>{row.count} 条</td>
                <td>
                  {stats.total > 0 ? ((row.count / stats.total) * 100).toFixed(0) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
