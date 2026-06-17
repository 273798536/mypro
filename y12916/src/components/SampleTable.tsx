import React, { useState } from 'react';
import { trainingSamples, sourceMaterials } from '../mockData';
import { SampleStatus, LabelJudgment } from '../types';

const statusBadge: Record<SampleStatus, string> = {
  train: 'badge-info',
  val: 'badge-success',
  test: 'badge',
  leak: 'badge-danger',
  duplicate: 'badge-warning',
  dirty: 'badge-danger',
};

const statusText: Record<SampleStatus, string> = {
  train: '训练集',
  val: '验证集',
  test: '测试集',
  leak: '泄漏',
  duplicate: '重复',
  dirty: '脏数据',
};

const labelBadge: Record<LabelJudgment, string> = {
  positive: 'cell-danger',
  negative: 'cell-success',
  neutral: 'cell-info',
  uncertain: 'cell-highlight',
};

const labelText: Record<LabelJudgment, string> = {
  positive: '正样本',
  negative: '负样本',
  neutral: '中性',
  uncertain: '不确定',
};

const typeText: Record<string, string> = {
  old_table: '旧表',
  shared_drive: '共享盘',
  evaluation_question_bank: '评测题库',
  supplementary_note: '补录备注',
  manual_correction: '人工修正',
};

const SampleTable: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');

  const filtered =
    filter === 'all'
      ? trainingSamples
      : filter === 'flagged'
      ? trainingSamples.filter((s) => s.flagged)
      : filter === 'dirty'
      ? trainingSamples.filter((s) => ['dirty', 'duplicate', 'leak'].includes(s.status))
      : trainingSamples.filter((s) => s.status === filter);

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'flagged', label: '已标记风险' },
    { key: 'dirty', label: '脏样本/重复/泄漏' },
    { key: 'train', label: '训练集' },
    { key: 'val', label: '验证集' },
    { key: 'test', label: '测试集' },
  ];

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon" />
          样本明细 · 溯源到原始材料
        </div>
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`tab ${filter === t.key ? 'active' : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>样本编号</th>
              <th>内容</th>
              <th>标签</th>
              <th>原始标签</th>
              <th>状态</th>
              <th>来源材料</th>
              <th>出现在</th>
              <th>备注</th>
              <th>风险标记</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const src = sourceMaterials.find((m) => m.id === s.sourceMaterialId);
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12 }}>
                    {s.sampleNo}
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>{s.content}</div>
                    {s.rawValue !== s.normalizedValue && s.normalizedValue && (
                      <div style={{ marginTop: 4, fontSize: 11 }}>
                        <span style={{ color: 'var(--text-muted)' }}>原值:</span>{' '}
                        <span className="value-old" style={{ color: '#ff8fa3' }}>{s.rawValue}</span>
                        {' → '}
                        <span className="value-new" style={{ color: '#6ee0ac' }}>{s.normalizedValue}</span>
                        {s.unit && <span style={{ color: 'var(--text-muted)' }}> ({s.unit})</span>}
                      </div>
                    )}
                    {s.manualCorrections.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {s.manualCorrections.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              fontSize: 11,
                              padding: '4px 6px',
                              background: 'rgba(245,196,81,0.06)',
                              borderRadius: 4,
                              marginBottom: 3,
                              lineHeight: 1.5,
                            }}
                          >
                            <span style={{ color: '#f5c451' }}>人工修正:</span>{' '}
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {c.field}: <span className="value-old">{c.oldValue}</span> →{' '}
                              <span className="value-new">{c.newValue}</span>
                            </span>
                            <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 10 }}>
                              {c.operator} · {c.timestamp} · {c.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={labelBadge[s.label]}>{labelText[s.label]}</span>
                  </td>
                  <td>
                    {s.originalLabel && s.originalLabel !== s.label ? (
                      <span className="cell-highlight" style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                        {labelText[s.originalLabel]}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>同标签</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${statusBadge[s.status]}`}>
                      <span className="badge-dot" />
                      {statusText[s.status]}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ color: 'var(--text-primary)' }}>{src?.name}</div>
                    {s.sourceRow !== undefined && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        第{s.sourceRow}行 · {src && typeText[src.type]}
                      </div>
                    )}
                    {src?.location && (
                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: 10,
                          fontFamily: 'monospace',
                          marginTop: 2,
                          wordBreak: 'break-all',
                        }}
                      >
                        {src.location}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.appearsInSets.map((set) => (
                        <span
                          key={set}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 4,
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {set}
                        </span>
                      ))}
                    </div>
                    {s.duplicatesOf && (
                      <div style={{ fontSize: 11, color: '#f5c451', marginTop: 4 }}>
                        ⚠ 重复于 {trainingSamples.find((x) => x.id === s.duplicatesOf)?.sampleNo || s.duplicatesOf}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 11, maxWidth: 200 }}>
                    {s.annotations.map((a, i) => (
                      <div key={i} style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
                        • {a}
                      </div>
                    ))}
                  </td>
                  <td>
                    {s.flagged ? (
                      <div>
                        <span className="cell-danger">⚠ 风险</span>
                        {s.flagReason && (
                          <div style={{ fontSize: 11, color: '#ff8fa3', marginTop: 4, lineHeight: 1.5 }}>
                            {s.flagReason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SampleTable;
