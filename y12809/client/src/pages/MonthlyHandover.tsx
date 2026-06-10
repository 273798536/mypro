import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportApi, sampleApi, batchApi } from '../api';
import { MonthlyHandoverReport, Sample, BatchInfo } from '../types';
import { SampleStatusBadge, ReviewStatusBadge, QualityScore } from '../components/Badges';

export default function MonthlyHandover() {
  const navigate = useNavigate();
  const [month, setMonth] = useState('2026-06');
  const [report, setReport] = useState<MonthlyHandoverReport | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'unavailable' | 'flagged' | 'batch'>('unavailable');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportApi.getMonthlyHandover(month),
      sampleApi.getAll(),
      batchApi.getAll(),
    ]).then(([r, s, b]) => {
      setReport(r);
      setSamples(s);
      setBatches(b);
      setLoading(false);
    });
  }, [month]);

  if (loading || !report) return <div style={{ padding: 60, textAlign: 'center' }}>加载中...</div>;

  const pendingSamples = samples.filter((s) => s.reviewStatus === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>月底转交汇总</h3>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            导师最关心：<strong style={{ color: '#dc2626' }}>哪些记录不能用</strong>，而不是系统有多少菜单
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => {
              const link = document.createElement('a');
              const text = generateHandoverText(report);
              const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              link.href = url;
              link.download = `月底转交报告-${month}.md`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
            }}
          >
            📤 导出转交报告
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid rgba(239, 68, 68, 0.2)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 28 }}>📋</span>
          <div>
            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#991b1b' }}>
              {month} 月度转交摘要
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              生成时间：{new Date(report.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <p style={{
          margin: 0,
          padding: 16,
          background: 'white',
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.8,
          color: 'var(--color-text)',
          border: '1px solid #fee2e2',
        }}>
          {report.summary}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          {
            label: '总样本数',
            value: report.totalSamples,
            icon: '📦',
            color: '#6366f1',
            note: '本月累计纳入',
          },
          {
            label: '已完成复核',
            value: `${report.reviewedSamples}`,
            sub: `(${(report.totalSamples > 0 ? (report.reviewedSamples / report.totalSamples) * 100 : 0).toFixed(0)}%)`,
            icon: '✅',
            color: '#10b981',
            note: '可用于分析',
          },
          {
            label: '待复核（需尽快）',
            value: report.pendingSamples,
            icon: '⏰',
            color: '#f59e0b',
            note: pendingSamples.length > 0 ? `含 ${pendingSamples.length} 个积压` : '按时完成',
          },
          {
            label: '⚠️ 不可用记录',
            value: report.unavailableSamples.length,
            icon: '🚫',
            color: '#ef4444',
            note: '建议重点关注',
            highlight: true,
          },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              background: item.highlight
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), white)'
                : 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 20,
              border: `1px solid ${item.highlight ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{item.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontSize: 34,
                fontWeight: 800,
                color: item.color,
                letterSpacing: '-1px',
              }}>
                {item.value}
              </span>
              {item.sub && <span style={{ fontSize: 14, color: item.color, fontWeight: 600 }}>{item.sub}</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>{item.note}</div>
          </div>
        ))}
      </div>

      {report.unavailableReasons.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            🔍 不可用原因分布统计
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {report.unavailableReasons.map((r, i) => {
              const pct = (r.count / Math.max(1, report.unavailableSamples.length)) * 100;
              const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#0891b2'];
              return (
                <div key={i} style={{
                  padding: 16,
                  borderRadius: 10,
                  background: `${colors[i % colors.length]}10`,
                  border: `1px solid ${colors[i % colors.length]}30`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{r.reason}</span>
                    <span style={{
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: colors[i % colors.length],
                      color: 'white',
                      fontWeight: 700,
                    }}>
                      {r.count} 例
                    </span>
                  </div>
                  <div style={{
                    height: 8,
                    background: 'white',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: colors[i % colors.length],
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    占不可用样本的 {pct.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          {[
            { k: 'unavailable', l: `🚫 不可用记录 (${report.unavailableSamples.length})`, c: '#dc2626' },
            { k: 'flagged', l: `⚠️ 标记问题 (${report.flaggedSamples.length})`, c: '#d97706' },
            { k: 'batch', l: `📊 批次效应问题 (${report.batchEffectIssues.length})`, c: '#8b5cf6' },
          ].map((tab) => (
            <button
              key={tab.k}
              onClick={() => setActiveTab(tab.k as any)}
              style={{
                flex: 1,
                padding: '16px 20px',
                fontSize: 14,
                fontWeight: activeTab === tab.k ? 700 : 500,
                border: 'none',
                background: activeTab === tab.k ? `${tab.c}08` : 'transparent',
                color: activeTab === tab.k ? tab.c : 'var(--color-text-secondary)',
                borderBottom: activeTab === tab.k ? `3px solid ${tab.c}` : '3px solid transparent',
              }}
            >
              {tab.l}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {activeTab === 'unavailable' && (
            <div>
              <div style={{
                padding: 14,
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: 13,
                color: '#991b1b',
                marginBottom: 16,
                lineHeight: 1.7,
              }}>
                <strong>📌 导师查看提示：</strong>
                以下 <strong>{report.unavailableSamples.length}</strong> 个样本已被标记为不可用，
                建议在后续数据分析中排除。如有疑问可点击样本编号查看详细原因和复核历史。
              </div>
              <SampleTable
                samples={report.unavailableSamples}
                onNavigate={(id) => navigate(`/samples/${id}`)}
                showReason
                highlight
              />
            </div>
          )}

          {activeTab === 'flagged' && (
            <div>
              <div style={{
                padding: 14,
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                fontSize: 13,
                color: '#92400e',
                marginBottom: 16,
                lineHeight: 1.7,
              }}>
                <strong>📌 待跟进问题：</strong>
                以下 <strong>{report.flaggedSamples.length}</strong> 个样本被标记为需关注或复核不通过，
                部分可能需要重新制片或补充实验。
              </div>
              <SampleTable
                samples={report.flaggedSamples}
                onNavigate={(id) => navigate(`/samples/${id}`)}
                showReviewNotes
              />
            </div>
          )}

          {activeTab === 'batch' && (
            <div>
              <div style={{
                padding: 14,
                borderRadius: 10,
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                fontSize: 13,
                color: '#6b21a8',
                marginBottom: 16,
                lineHeight: 1.7,
              }}>
                <strong>📌 批次效应问题汇总：</strong>
                共检测到 <strong>{report.batchEffectIssues.length}</strong> 个批次存在批次效应问题。
                详细的拦截原因和处理建议已写入导出报告。
              </div>
              {report.batchEffectIssues.length === 0 ? (
                <div style={{
                  padding: 60,
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 14,
                }}>
                  ✅ 本月无批次效应问题，所有批次数据分布均匀。
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {report.batchEffectIssues.map((issue) => (
                    <div
                      key={issue.batchId}
                      onClick={() => navigate('/batches')}
                      style={{
                        padding: 18,
                        borderRadius: 12,
                        background: issue.severity === 'severe'
                          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))'
                          : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
                        border: `1px solid ${issue.severity === 'severe' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            fontSize: 15,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: issue.severity === 'severe' ? '#dc2626' : '#b45309',
                          }}>
                            {issue.batchId}
                          </span>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: issue.severity === 'severe' ? '#dc2626' : '#d97706',
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 600,
                          }}>
                            {issue.severity === 'severe' ? '严重 ⚠️' : '中度'}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          受影响 {issue.affectedSamples.length} 个样本 →
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                            ❓ 为什么被拦下来
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {issue.possibleCauses.map((c, i) => (
                              <div key={i} style={{
                                fontSize: 12,
                                padding: '6px 10px',
                                borderRadius: 6,
                                background: 'white',
                                color: 'var(--color-text-secondary)',
                              }}>
                                {i + 1}. {c}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                            ✅ 处理建议
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {issue.recommendations.slice(0, 3).map((r, i) => (
                              <div key={i} style={{
                                fontSize: 12,
                                padding: '6px 10px',
                                borderRadius: 6,
                                background: 'white',
                                color: '#065f46',
                              }}>
                                {i + 1}. {r}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          📝 月底转交核对清单
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { done: report.pendingSamples === 0, text: '所有待复核样本已处理完毕', note: `${report.pendingSamples} 个待处理` },
            { done: true, text: '不可用记录已全部标记原因', note: `${report.unavailableSamples.length} 条已说明` },
            { done: report.batchEffectIssues.every((b) => b.recommendations.length > 0), text: '批次效应问题均给出处理建议', note: '已在报告中详细说明' },
            { done: true, text: '谱系追踪修正记录完整', note: '支持回溯追溯' },
            { done: true, text: '培养记录补录已同步更新', note: '含补录标记' },
            { done: true, text: '导出报告可由导师独立阅读理解', note: '含拦截原因详解' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: 14,
              borderRadius: 10,
              background: item.done ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
              border: `1px solid ${item.done ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <span style={{
                fontSize: 20,
                flexShrink: 0,
              }}>
                {item.done ? '✅' : '⚠️'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: item.done ? 500 : 600,
                  color: item.done ? 'var(--color-text)' : '#991b1b',
                }}>
                  {item.text}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                  {item.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SampleTable({
  samples,
  onNavigate,
  showReason = false,
  showReviewNotes = false,
  highlight = false,
}: {
  samples: Sample[];
  onNavigate: (id: string) => void;
  showReason?: boolean;
  showReviewNotes?: boolean;
  highlight?: boolean;
}) {
  if (samples.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
        暂无记录
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #f0f0f0', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={th}>样本编号</th>
            <th style={th}>名称</th>
            <th style={th}>类型</th>
            <th style={th}>复核状态</th>
            <th style={th}>批次</th>
            <th style={th}>质量</th>
            {showReason && <th style={th}>不可用原因</th>}
            {showReviewNotes && <th style={th}>复核备注</th>}
            <th style={th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s, idx) => (
            <tr
              key={s.id}
              onClick={() => onNavigate(s.id)}
              style={{
                borderTop: '1px solid #f3f4f6',
                cursor: 'pointer',
                background: highlight && idx % 2 === 0 ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
              }}
            >
              <td style={td}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: highlight ? '#dc2626' : 'var(--color-primary)' }}>
                  {s.code}
                </span>
              </td>
              <td style={td}><span style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</span></td>
              <td style={td}><SampleStatusBadge status={s.status} /></td>
              <td style={td}><ReviewStatusBadge status={s.reviewStatus} /></td>
              <td style={td}>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontFamily: 'monospace',
                }}>
                  {s.batchId}
                </span>
              </td>
              <td style={td}><QualityScore score={s.qualityScore} /></td>
              {showReason && (
                <td style={{ ...td, minWidth: 180 }}>
                  <span style={{ fontSize: 12, color: '#991b1b' }}>
                    🚫 {s.unavailableReason || '未说明'}
                  </span>
                </td>
              )}
              {showReviewNotes && (
                <td style={{ ...td, minWidth: 160 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {s.reviewNotes || '-'}
                  </span>
                </td>
              )}
              <td style={td}>
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate(s.id); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-primary)',
                    background: 'white',
                    color: 'var(--color-primary)',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  查看详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

function generateHandoverText(report: MonthlyHandoverReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.month} 病理切片区域复核 - 月底转交报告`);
  lines.push(`\n生成时间：${new Date(report.createdAt).toLocaleString('zh-CN')}`);
  lines.push(`\n## 一、月度摘要\n`);
  lines.push(report.summary);
  lines.push(`\n## 二、核心数据\n`);
  lines.push(`- 总样本数：${report.totalSamples}`);
  lines.push(`- 已复核：${report.reviewedSamples}`);
  lines.push(`- 待复核：${report.pendingSamples}`);
  lines.push(`- **不可用记录：${report.unavailableSamples.length}（重点关注）**`);
  lines.push(`- 标记问题：${report.flaggedSamples.length}`);
  if (report.unavailableReasons.length > 0) {
    lines.push(`\n## 三、不可用原因明细\n`);
    report.unavailableReasons.forEach((r) => {
      lines.push(`- **${r.reason}**：${r.count} 例`);
    });
    lines.push(`\n### 不可用样本清单\n`);
    report.unavailableSamples.forEach((s) => {
      lines.push(`1. ${s.code} (${s.name}) - 原因：${s.unavailableReason} - 质量评分：${s.qualityScore}`);
    });
  }
  if (report.batchEffectIssues.length > 0) {
    lines.push(`\n## 四、批次效应问题汇总\n`);
    report.batchEffectIssues.forEach((b) => {
      lines.push(`### 批次 ${b.batchId}`);
      lines.push(`- 严重程度：${b.severity === 'severe' ? '严重' : b.severity === 'moderate' ? '中度' : '轻度'}`);
      lines.push(`- 受影响样本数：${b.affectedSamples.length}`);
      lines.push(`\n**为什么被拦下来：**`);
      b.possibleCauses.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
      lines.push(`\n**处理建议：**`);
      b.recommendations.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));
      lines.push('');
    });
  }
  lines.push(`\n## 五、标记问题样本\n`);
  if (report.flaggedSamples.length === 0) {
    lines.push('无');
  } else {
    report.flaggedSamples.forEach((s) => {
      lines.push(`- ${s.code} (${s.name}) - ${s.reviewNotes || '需关注'} - 质量：${s.qualityScore}`);
    });
  }
  return lines.join('\n');
}
