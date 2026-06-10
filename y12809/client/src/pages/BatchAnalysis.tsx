import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { batchApi, sampleApi, sequencingApi, reportApi } from '../api';
import { BatchInfo, Sample, SequencingResult, BatchEffectReport } from '../types';
import { SampleStatusBadge, ReviewStatusBadge, QualityScore } from '../components/Badges';

const SEVERITY_COLORS: Record<string, string> = {
  none: '#22c55e',
  mild: '#84cc16',
  moderate: '#f59e0b',
  severe: '#ef4444',
};

const SEVERITY_LABELS: Record<string, string> = {
  none: '无',
  mild: '轻度',
  moderate: '中度',
  severe: '严重 ⚠️',
};

const BATCH_COLORS: Record<string, string> = {
  'BATCH-2026-05-A': '#3b82f6',
  'BATCH-2026-05-B': '#ef4444',
  'BATCH-2026-06-A': '#10b981',
  'BATCH-2026-06-B': '#8b5cf6',
};

export default function BatchAnalysis() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sequencing, setSequencing] = useState<SequencingResult[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([batchApi.getAll(), sampleApi.getAll(), sequencingApi.getAll()]).then(([b, s, seq]) => {
      setBatches(b);
      setSamples(s);
      setSequencing(seq);
      setLoading(false);
    });
  }, []);

  const selectedBatchInfo = batches.find((b) => b.id === selectedBatch);
  const selectedReport = selectedBatchInfo?.report;
  const selectedSamples = selectedBatch ? samples.filter((s) => s.batchId === selectedBatch) : samples;
  const selectedSequencing = selectedBatch ? sequencing.filter((r) => r.batchId === selectedBatch) : sequencing;

  const qualityBarData = batches.map((b) => ({
    name: b.id.split('-').slice(-2).join('-'),
    质量合格率: Math.round((b.statuses.normal / Math.max(1, b.sampleCount)) * 100),
    边界样本率: Math.round((b.statuses.boundary / Math.max(1, b.sampleCount)) * 100),
    坏样本率: Math.round((b.statuses.bad / Math.max(1, b.sampleCount)) * 100),
    batchEffectScore: b.report?.detected ? (b.report.severity === 'severe' ? 75 : b.report.severity === 'moderate' ? 50 : 25) : 10,
  }));

  const pcaData = selectedSequencing.slice(0, 80).map((r) => ({
    x: r.pcaCoordinates.pc1,
    y: r.pcaCoordinates.pc2,
    z: r.qualityScore,
    batch: r.batchId,
    quality: r.qualityScore,
    batchScore: r.batchEffectScore,
    sample: r.sampleId,
  }));

  const qualityLineData = selectedSequencing.slice(0, 30).map((r, i) => ({
    idx: i + 1,
    质量评分: r.qualityScore,
    批次效应分: r.batchEffectScore,
    sample: samples.find(s => s.id === r.sampleId)?.code || '',
  }));

  const handleExport = async (batchId?: string) => {
    try {
      setExporting(true);
      const blob = await reportApi.exportReport(batchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `病理切片复核报告-${batchId || '全部'}-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>批次效应分析</h3>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            以测序结果为主线：通过 PCA 聚类、质量分布等多维度分析，快速定位批次效应问题
          </p>
        </div>
        <button
          onClick={() => handleExport(selectedBatch || undefined)}
          disabled={exporting}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: exporting ? '#9ca3af' : '#2563eb',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          {exporting ? '导出中...' : '📄 导出分析报告'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {batches.map((batch) => (
          <div
            key={batch.id}
            onClick={() => setSelectedBatch(selectedBatch === batch.id ? null : batch.id)}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 18,
              boxShadow: 'var(--shadow-sm)',
              border: `2px solid ${selectedBatch === batch.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{batch.id}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>共 {batch.sampleCount} 个样本</div>
              </div>
              {batch.report?.detected && (
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: `${SEVERITY_COLORS[batch.report.severity]}20`,
                    color: SEVERITY_COLORS[batch.report.severity],
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {SEVERITY_LABELS[batch.report.severity]}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <StatMini label="正常" value={batch.statuses.normal} color="#22c55e" />
              <StatMini label="边界" value={batch.statuses.boundary} color="#f59e0b" />
              <StatMini label="坏" value={batch.statuses.bad} color="#ef4444" />
            </div>
            {selectedBatch === batch.id && (
              <div style={{
                position: 'absolute',
                bottom: -2,
                left: 0,
                right: 0,
                height: 3,
                background: 'var(--color-primary)',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              }} />
            )}
          </div>
        ))}
      </div>

      {selectedReport && selectedReport.detected && (
        <div
          style={{
            background: selectedReport.severity === 'severe'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
            borderRadius: 'var(--radius-md)',
            padding: 24,
            border: `1px solid ${selectedReport.severity === 'severe' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 24,
          }}
        >
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 32 }}>🚨</span>
              <div>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: selectedReport.severity === 'severe' ? '#dc2626' : '#b45309' }}>
                  批次 {selectedBatch} 被拦截
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  检测到 <strong>{SEVERITY_LABELS[selectedReport.severity]}</strong> 批次效应
                </p>
              </div>
            </div>
            <div style={{
              padding: 14,
              borderRadius: 10,
              background: 'white',
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>主成分方差贡献</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{selectedReport.pc1Variance.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>PC1</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{selectedReport.pc2Variance.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>PC2</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--color-text)' }}>
              ❓ 为什么被拦下来
            </div>
            <div style={{
              padding: 14,
              borderRadius: 10,
              background: 'white',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                <strong>聚类模式：</strong>{selectedReport.clusteringPattern}
              </div>
              <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>可能原因分析：</div>
                {selectedReport.possibleCauses.map((c, i) => (
                  <div key={i} style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    marginBottom: 4,
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.06)',
                    color: '#991b1b',
                    display: 'flex',
                    gap: 8,
                  }}>
                    <span style={{ fontWeight: 700 }}>{i + 1}.</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--color-text)' }}>
              ✅ 处理建议（导出报告可见）
            </div>
            <div style={{
              padding: 14,
              borderRadius: 10,
              background: 'white',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {selectedReport.recommendations.map((r, i) => (
                <div key={i} style={{
                  fontSize: 12,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.08)',
                  color: '#065f46',
                  display: 'flex',
                  gap: 8,
                  lineHeight: 1.6,
                }}>
                  <span style={{ fontWeight: 700 }}>{i + 1}.</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>各批次质量分布对比</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              百分比代表该批次内各类样本的占比，橙色柱为批次效应风险指示值
            </p>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: '#6b7280' }} />
                <YAxis fontSize={11} tick={{ fill: '#6b7280' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="质量合格率" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="边界样本率" fill="#f59e0b" />
                <Bar dataKey="坏样本率" fill="#ef4444" />
                <Bar dataKey="batchEffectScore" name="风险指示" fill="#a855f7" opacity={0.6} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              PCA 聚类分析 {selectedBatch && `（批次：${selectedBatch}）`}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              同色点聚在一起且与其他色分离 = 存在批次效应。点越大 = 质量越高。
            </p>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="PC1"
                  label={{ value: '主成分1', position: 'bottom', offset: 0, fontSize: 11, fill: '#6b7280' }}
                  fontSize={10} tick={{ fill: '#9ca3af' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="PC2"
                  label={{ value: '主成分2', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#6b7280' }}
                  fontSize={10} tick={{ fill: '#9ca3af' }}
                />
                <ZAxis type="number" dataKey="z" range={[30, 200]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as any;
                      return (
                        <div style={{
                          background: 'white',
                          padding: 12,
                          borderRadius: 8,
                          boxShadow: 'var(--shadow-lg)',
                          border: '1px solid var(--color-border)',
                          fontSize: 12,
                          minWidth: 200,
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 6, color: BATCH_COLORS[d.batch] || '#2563eb' }}>{d.batch}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 8 }}>
                            {samples.find(s => s.id === d.sample)?.code || d.sample.slice(0, 12)}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <div>质量: <strong style={{ color: d.quality > 70 ? '#22c55e' : d.quality > 50 ? '#f59e0b' : '#ef4444' }}>{d.quality.toFixed(0)}</strong></div>
                            <div>效应分: <strong style={{ color: d.batchScore > 50 ? '#ef4444' : '#22c55e' }}>{d.batchScore.toFixed(0)}</strong></div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {(selectedBatch ? [selectedBatch] : Object.keys(BATCH_COLORS)).map((batch) => (
                  <Scatter
                    key={batch}
                    name={batch}
                    data={pcaData.filter(d => d.batch === batch)}
                    fill={BATCH_COLORS[batch]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>样本质量 vs 批次效应</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              <span style={{ color: '#22c55e' }}>■</span> 质量评分 ｜
              <span style={{ color: '#ef4444' }}>■</span> 批次效应分
              （两线分离越大，批次效应问题越严重）
            </p>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityLineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="idx" fontSize={10} tick={{ fill: '#9ca3af' }} label={{ value: '样本序号', position: 'bottom', offset: -5, fontSize: 11, fill: '#6b7280' }} />
                <YAxis fontSize={10} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as any;
                      return (
                        <div style={{
                          background: 'white',
                          padding: 12,
                          borderRadius: 8,
                          boxShadow: 'var(--shadow-lg)',
                          fontSize: 12,
                          border: '1px solid var(--color-border)',
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.sample || `样本 #${label}`}</div>
                          {payload.map((p: any) => (
                            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                              <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}:</span>
                              <strong style={{ color: p.color }}>{p.value.toFixed(0)}</strong>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="质量评分" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="批次效应分" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                本批次受影响样本
                {selectedBatch && `（${selectedBatch}）`}
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                共 {selectedSamples.length} 个样本，点击进入详情复核
              </p>
            </div>
            <button
              onClick={() => setSelectedBatch(null)}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)',
                borderRadius: 6,
                fontSize: 11,
                color: 'var(--color-text-secondary)',
              }}
            >
              查看全部
            </button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <tr style={{ background: '#fafafa' }}>
                  <th style={thStyle}>编号</th>
                  <th style={thStyle}>类型</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>质量</th>
                </tr>
              </thead>
              <tbody>
                {selectedSamples.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/samples/${s.id}`)}
                    style={{
                      borderTop: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: s.isUnavailable ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{s.code}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{s.name}</div>
                      {s.isUnavailable && (
                        <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>🚫 {s.unavailableReason?.slice(0, 14)}</div>
                      )}
                    </td>
                    <td style={tdStyle}><SampleStatusBadge status={s.status} /></td>
                    <td style={tdStyle}><ReviewStatusBadge status={s.reviewStatus} /></td>
                    <td style={tdStyle}><QualityScore score={s.qualityScore} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
};
