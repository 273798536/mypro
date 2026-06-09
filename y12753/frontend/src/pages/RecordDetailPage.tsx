import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import {
  BufferRecordDetail,
  RecordStatus,
  STATUS_LABEL,
  STATUS_COLOR,
  TemperaturePoint,
  WeighingRecord,
  StatusLog,
  BufferComponent,
} from '../types';

import type { StatusTransition } from '../types';

const STATUS_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  draft: ['imported'],
  imported: ['reviewing', 'draft'],
  reviewing: ['confirmed', 'imported'],
  confirmed: ['reported', 'reviewing'],
  reported: ['confirmed'],
};

type TabKey = 'overview' | 'temperature' | 'review' | 'export';

const RecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<BufferRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [reportPreview, setReportPreview] = useState<Record<string, unknown> | null>(null);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);

  const recordId = Number(id);

  const loadRecord = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await api.getRecord(recordId);
      setRecord(data);
    } catch (e) {
      if (e instanceof Error && (e.message.includes('404') || e.message.includes('不存在'))) {
        setNotFound(true);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isNaN(recordId)) {
      loadRecord();
    } else {
      setNotFound(true);
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    if (activeTab === 'export' && record && !reportPreview) {
      loadReportPreview();
    }
  }, [activeTab, record]);

  const loadReportPreview = async () => {
    setReportPreviewLoading(true);
    try {
      const data = await api.getReportPreview(recordId);
      setReportPreview(data);
    } catch (e) {
      setReportPreview(null);
    } finally {
      setReportPreviewLoading(false);
    }
  };

  const handleTransition = async (toStatus: RecordStatus) => {
    setTransitionError(null);
    setTransitionLoading(true);
    try {
      const data: StatusTransition = { target_status: toStatus };
      const updated = await api.transitionStatus(recordId, data);
      setRecord(updated);
    } catch (e) {
      if (e instanceof Error) {
        setTransitionError(e.message);
      } else {
        setTransitionError('状态流转失败');
      }
    } finally {
      setTransitionLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!record) return;
    const filename = `buffer_report_${record.batch_no}_${record.record_date}.xlsx`;
    api.downloadReport(recordId, filename);
  };

  if (loading) {
    return (
      <div className="content">
        <div className="card">
          <div className="empty">加载中...</div>
        </div>
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <div className="content">
        <div className="card">
          <div className="empty">记录不存在</div>
        </div>
      </div>
    );
  }

  const renderSummary = () => {
    const items: { k: string; v: React.ReactNode }[] = [
      { k: '批次号', v: record.batch_no },
      { k: '日期', v: record.record_date },
      { k: '缓冲液名称', v: record.buffer_name },
      { k: '目标pH', v: String(record.target_ph) },
      { k: '实际pH', v: record.actual_ph !== null && record.actual_ph !== undefined ? String(record.actual_ph) : '-' },
      { k: '目标体积', v: `${record.target_volume} L` },
      { k: '实际体积', v: record.actual_volume !== null && record.actual_volume !== undefined ? `${record.actual_volume} L` : '-' },
      { k: '操作人', v: record.operator || '-' },
      { k: '复核人', v: record.reviewer || '-' },
      {
        k: '状态',
        v: (
          <span className="badge" style={{ background: STATUS_COLOR[record.status] }}>
            {STATUS_LABEL[record.status]}
          </span>
        ),
      },
      {
        k: '称量精度',
        v: (
          <span className={`badge ${record.precision_pass === true ? 'badge-green' : record.precision_pass === false ? 'badge-red' : 'badge-gray'}`}>
            {record.precision_pass === true ? '通过' : record.precision_pass === false ? '未通过' : '未检测'}
          </span>
        ),
      },
      {
        k: '温度曲线结果',
        v: (
          <span className={`badge ${record.temp_curve_pass === true ? 'badge-green' : record.temp_curve_pass === false ? 'badge-red' : 'badge-gray'}`}>
            {record.temp_curve_pass === true ? '通过' : record.temp_curve_pass === false ? '未通过' : '未检测'}
          </span>
        ),
      },
    ];

    return (
      <div className="card">
        <h3>摘要信息</h3>
        <div className="summary-grid">
          {items.map((item, idx) => (
            <div key={idx} className="summary-item">
              <div className="k">{item.k}</div>
              <div className="v">{item.v}</div>
            </div>
          ))}
        </div>
        {record.remark && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ marginBottom: 4 }}>备注</div>
            <div>{record.remark}</div>
          </div>
        )}
      </div>
    );
  };

  const renderTabs = () => {
    const tabs: { key: TabKey; label: string }[] = [
      { key: 'overview', label: '概览' },
      { key: 'temperature', label: '温度曲线' },
      { key: 'review', label: '复核' },
      { key: 'export', label: '导出报告' },
    ];

    return (
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderComponentsTable = () => {
    if (!record.components || record.components.length === 0) {
      return <div className="empty">暂无组分数据</div>;
    }
    return (
      <table>
        <thead>
          <tr>
            <th>试剂名</th>
            <th>分子式</th>
            <th>摩尔质量</th>
            <th>目标浓度</th>
            <th>实际浓度</th>
            <th>理论质量</th>
            <th>实际称量</th>
            <th>纯度</th>
          </tr>
        </thead>
        <tbody>
          {record.components.map((c: BufferComponent, idx: number) => (
            <tr key={idx}>
              <td>{c.reagent_name}</td>
              <td>{c.formula || '-'}</td>
              <td>{c.molar_mass}</td>
              <td>{c.target_concentration}</td>
              <td>{c.actual_concentration !== null && c.actual_concentration !== undefined ? c.actual_concentration : '-'}</td>
              <td>{c.theoretical_mass !== null && c.theoretical_mass !== undefined ? c.theoretical_mass : '-'}</td>
              <td>{c.actual_mass !== null && c.actual_mass !== undefined ? c.actual_mass : '-'}</td>
              <td>{c.purity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderWeighingTable = () => {
    if (!record.weighing_records || record.weighing_records.length === 0) {
      return <div className="empty">暂无称量记录</div>;
    }
    return (
      <table>
        <thead>
          <tr>
            <th>试剂</th>
            <th>理论(g)</th>
            <th>实际(g)</th>
            <th>允许误差(%)</th>
            <th>实际误差(%)</th>
            <th>是否通过</th>
          </tr>
        </thead>
        <tbody>
          {record.weighing_records.map((w: WeighingRecord, idx: number) => (
            <tr key={idx}>
              <td>{w.reagent_name}</td>
              <td>{w.theoretical_mass}</td>
              <td>{w.actual_mass}</td>
              <td>{w.tolerance_pct}</td>
              <td>{w.error_pct !== null && w.error_pct !== undefined ? w.error_pct : '-'}</td>
              <td>
                <span className={`badge ${w.is_pass === true ? 'badge-green' : w.is_pass === false ? 'badge-red' : 'badge-gray'}`}>
                  {w.is_pass === true ? '通过' : w.is_pass === false ? '未通过' : '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderStatusTimeline = () => {
    if (!record.status_logs || record.status_logs.length === 0) {
      return <div className="empty">暂无状态日志</div>;
    }
    return (
      <div>
        {record.status_logs.map((log: StatusLog, idx: number) => (
          <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb', position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 0, top: 14, width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
            <div className="row" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{log.operator || '系统'}</span>
              <span className="muted">{new Date(log.created_at).toLocaleString()}</span>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              从 <span className="badge" style={{ background: STATUS_COLOR[log.from_status as RecordStatus] || '#6b7280' }}>{STATUS_LABEL[log.from_status as RecordStatus] || log.from_status}</span>
              {' → '}
              到 <span className="badge" style={{ background: STATUS_COLOR[log.to_status as RecordStatus] || '#6b7280' }}>{STATUS_LABEL[log.to_status as RecordStatus] || log.to_status}</span>
            </div>
            {log.remark && <div style={{ marginTop: 4, fontSize: 13 }}>备注：{log.remark}</div>}
          </div>
        ))}
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div>
      <div className="card">
        <h3>组分信息</h3>
        {renderComponentsTable()}
      </div>
      <div className="card">
        <h3>称量记录</h3>
        {renderWeighingTable()}
      </div>
      <div className="card">
        <h3>状态流转</h3>
        {renderStatusTimeline()}
      </div>
    </div>
  );

  const renderTemperatureChart = () => {
    const points = record.temperature_points || [];
    if (points.length === 0) {
      return <div className="empty">暂无温度数据</div>;
    }

    const width = 760;
    const height = 240;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const times = points.map((p) => p.time_minute);
    const setTemps = points.map((p) => p.set_temp);
    const actualTemps = points.map((p) => p.actual_temp);
    const allTemps = [...setTemps, ...actualTemps];

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minTemp = Math.min(...allTemps) - 2;
    const maxTemp = Math.max(...allTemps) + 2;

    const xScale = (t: number) =>
      padding.left + (maxTime === minTime ? chartW / 2 : ((t - minTime) / (maxTime - minTime)) * chartW);
    const yScale = (t: number) =>
      padding.top + chartH - (maxTemp === minTemp ? chartH / 2 : ((t - minTemp) / (maxTemp - minTemp)) * chartH);

    const setLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.time_minute)} ${yScale(p.set_temp)}`).join(' ');
    const actualLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.time_minute)} ${yScale(p.actual_temp)}`).join(' ');

    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minTemp + ((maxTemp - minTemp) * i) / yTicks);

    return (
      <div>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="temp-chart">
          {yTickValues.map((v, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={yScale(v)}
                x2={width - padding.right}
                y2={yScale(v)}
                stroke="#e5e7eb"
                strokeDasharray="3,3"
              />
              <text x={padding.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#9ca3af" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#9ca3af" />
          <text x={width / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="#6b7280">
            时间(分钟)
          </text>
          <text x={10} y={padding.top + chartH / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90, 10, ${padding.top + chartH / 2})`}>
            温度(℃)
          </text>
          <path d={setLine} fill="none" stroke="#2563eb" strokeWidth="2" />
          <path d={actualLine} fill="none" stroke="#ea580c" strokeWidth="2" />
          {points.map((p, i) => (
            <circle key={`s-${i}`} cx={xScale(p.time_minute)} cy={yScale(p.set_temp)} r="3" fill="#2563eb" />
          ))}
          {points.map((p, i) => (
            <circle key={`a-${i}`} cx={xScale(p.time_minute)} cy={yScale(p.actual_temp)} r="3" fill="#ea580c" />
          ))}
        </svg>
        <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <div className="row">
            <span style={{ display: 'inline-block', width: 16, height: 3, background: '#2563eb', marginRight: 6 }} />
            <span className="muted">设定温度</span>
          </div>
          <div className="row" style={{ marginLeft: 24 }}>
            <span style={{ display: 'inline-block', width: 16, height: 3, background: '#ea580c', marginRight: 6 }} />
            <span className="muted">实际温度</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTemperatureTable = () => {
    const points = record.temperature_points || [];
    if (points.length === 0) {
      return null;
    }
    return (
      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>时间(分钟)</th>
            <th>设定温度(℃)</th>
            <th>实际温度(℃)</th>
            <th>偏差(℃)</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p: TemperaturePoint, idx: number) => (
            <tr key={idx}>
              <td>{p.time_minute}</td>
              <td>{p.set_temp}</td>
              <td>{p.actual_temp}</td>
              <td>{(p.actual_temp - p.set_temp).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderTemperatureTab = () => (
    <div className="card">
      <h3>温度曲线</h3>
      {renderTemperatureChart()}
      {renderTemperatureTable()}
    </div>
  );

  const renderReviewTab = () => {
    const allowedTransitions = STATUS_TRANSITIONS[record.status] || [];

    return (
      <div className="card">
        <h3>复核管理</h3>
        <div className="row" style={{ marginBottom: 16 }}>
          <span className="muted">当前状态：</span>
          <span className="badge" style={{ background: STATUS_COLOR[record.status] }}>
            {STATUS_LABEL[record.status]}
          </span>
        </div>

        {transitionError && (
          <div className="error-text" style={{ marginBottom: 12, padding: 10, background: '#fef2f2', borderRadius: 6 }}>
            {transitionError}
          </div>
        )}

        {allowedTransitions.length > 0 ? (
          <div className="row">
            {allowedTransitions.map((toStatus) => (
              <button
                key={toStatus}
                className="btn btn-primary"
                disabled={transitionLoading}
                onClick={() => handleTransition(toStatus)}
              >
                推进到 {STATUS_LABEL[toStatus]}
              </button>
            ))}
          </div>
        ) : (
          <div className="muted">当前状态无可推进的流转路径</div>
        )}
      </div>
    );
  };

  const renderExportTab = () => (
    <div className="card">
      <h3>导出报告</h3>
      <div style={{ marginBottom: 16 }}>
        <div className="muted" style={{ marginBottom: 8 }}>报告预览（JSON）：</div>
        {reportPreviewLoading ? (
          <div className="empty">加载中...</div>
        ) : reportPreview ? (
          <pre
            style={{
              background: '#f9fafb',
              padding: 14,
              borderRadius: 6,
              fontSize: 13,
              maxHeight: 400,
              overflow: 'auto',
              margin: 0,
            }}
          >
            {JSON.stringify(reportPreview, null, 2)}
          </pre>
        ) : (
          <div className="empty">加载预览失败</div>
        )}
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={handleDownloadReport}>
          下载 Excel 报告
        </button>
        <span className="muted">
          文件名：buffer_report_{record.batch_no}_{record.record_date}.xlsx
        </span>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'temperature':
        return renderTemperatureTab();
      case 'review':
        return renderReviewTab();
      case 'export':
        return renderExportTab();
      default:
        return null;
    }
  };

  return (
    <div className="content">
      <h2 className="page-title">记录详情</h2>
      <p className="page-subtitle">批次号：{record.batch_no}</p>
      {renderSummary()}
      {renderTabs()}
      {renderActiveTab()}
    </div>
  );
};

export default RecordDetailPage;
