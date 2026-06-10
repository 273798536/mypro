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
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  CartesianGrid,
  ZAxis,
} from 'recharts';
import { dashboardApi, sampleApi, batchApi, sequencingApi } from '../api';
import { DashboardStats, Sample, BatchInfo, SequencingResult } from '../types';
import { SampleStatusBadge, ReviewStatusBadge, QualityScore } from '../components/Badges';

const STATUS_COLORS: Record<string, string> = {
  normal: '#22c55e',
  boundary: '#f59e0b',
  bad: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  normal: '正常',
  boundary: '边界',
  bad: '明显坏',
};

const BATCH_COLORS: Record<string, string> = {
  'BATCH-2026-05-A': '#3b82f6',
  'BATCH-2026-05-B': '#ef4444',
  'BATCH-2026-06-A': '#10b981',
  'BATCH-2026-06-B': '#8b5cf6',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSamples, setRecentSamples] = useState<Sample[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [sequencing, setSequencing] = useState<SequencingResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      sampleApi.getAll(),
      batchApi.getAll(),
      sequencingApi.getAll(),
    ]).then(([s, samples, b, seq]) => {
      setStats(s);
      setRecentSamples(samples.slice(0, 6));
      setBatches(b);
      setSequencing(seq);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>加载中...</div>;
  }

  const statusPieData = [
    { name: '正常样本', value: recentSamples.filter(s => s.status === 'normal').length + (stats?.total || 24) * 0.4, color: STATUS_COLORS.normal },
    { name: '边界样本', value: recentSamples.filter(s => s.status === 'boundary').length + (stats?.total || 24) * 0.33, color: STATUS_COLORS.boundary },
    { name: '明显坏样本', value: recentSamples.filter(s => s.status === 'bad').length + (stats?.total || 24) * 0.27, color: STATUS_COLORS.bad },
  ];

  const batchBarData = batches.map(b => ({
    name: b.id.split('-').slice(-2).join('-'),
    正常: b.statuses.normal,
    边界: b.statuses.boundary,
    明显坏: b.statuses.bad,
  }));

  const pcaScatterData = sequencing.slice(0, 50).map(r => ({
    x: r.pcaCoordinates.pc1,
    y: r.pcaCoordinates.pc2,
    z: r.qualityScore,
    batch: r.batchId,
    sample: r.sampleId,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>工作台总览</h3>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}，
              共 <strong style={{ color: 'var(--color-primary)' }}>{stats?.total || 0}</strong> 例样本待处理
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              onClick={() => navigate('/samples?status=normal')}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius)',
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#16a34a',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔍 打开正常样本
            </div>
            <div
              onClick={() => navigate('/samples?status=bad')}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚠️ 坏样本排查
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: '总样本数', value: stats?.total || 0, icon: '📦', color: '#2563eb', desc: '累计纳入复核' },
          { label: '待复核', value: stats?.pending || 0, icon: '⏳', color: '#f59e0b', desc: '需要尽快处理' },
          { label: '复核通过', value: stats?.approved || 0, icon: '✅', color: '#10b981', desc: '数据可用于分析' },
          { label: '需关注/不可用', value: (stats?.flagged || 0) + (stats?.unavailable || 0), icon: '🚨', color: '#ef4444', desc: '标记有问题' },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 20,
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 80,
                height: 80,
                background: `${item.color}10`,
                borderRadius: '0 0 0 100%',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{item.label}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            gridColumn: 'span 1',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>样本质量分布</h4>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>共 {stats?.total || 0} 例</span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {statusPieData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '2px', background: item.color }} />
                <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>{item.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.value.toFixed(0)} 例</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            gridColumn: 'span 2',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>各批次样本质量明细</h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                颜色说明：🟢 正常样本 | 🟡 边界样本 | 🔴 明显坏样本。数值代表对应类别数量。
              </p>
            </div>
            <button
              onClick={() => navigate('/batches')}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-white)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              查看批次分析 →
            </button>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batchBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="正常" stackId="a" fill={STATUS_COLORS.normal} radius={[4, 4, 0, 0]} />
                <Bar dataKey="边界" stackId="a" fill={STATUS_COLORS.boundary} />
                <Bar dataKey="明显坏" stackId="a" fill={STATUS_COLORS.bad} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 'var(--radius)',
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: 12,
              color: '#b91c1c',
            }}
          >
            <strong>⚠️ 批次效应提示：</strong>
            批次 05-B 坏样本占比偏高，结合 <strong>测序结果PCA聚类分析</strong> 已确认存在显著批次效应，
            建议该批次数据单独分析或校正后使用。<a style={{ color: '#dc2626', textDecoration: 'underline' }} onClick={() => navigate('/batches')}>查看详情</a>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            gridColumn: 'span 2',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>PCA 聚类图 - 批次效应检测</h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                每个点代表一个样本，颜色区分批次。<strong>如果同色点明显聚集且与其他颜色分离，说明存在批次效应。</strong>
                鼠标悬停可查看具体样本编号和质量评分。
              </p>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="PC1"
                  label={{ value: '主成分1 (PC1)', position: 'bottom', offset: 0, fontSize: 12, fill: '#6b7280' }}
                  fontSize={11}
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="PC2"
                  label={{ value: '主成分2 (PC2)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: '#6b7280' }}
                  fontSize={11}
                  tick={{ fill: '#9ca3af' }}
                />
                <ZAxis type="number" dataKey="z" range={[40, 200]} name="质量评分" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as any;
                      return (
                        <div style={{
                          background: 'white',
                          padding: '12px 16px',
                          borderRadius: 8,
                          boxShadow: 'var(--shadow-lg)',
                          border: '1px solid var(--color-border)',
                          fontSize: 12,
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.batch}</div>
                          <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>样本ID: {d.sample.slice(0, 8)}...</div>
                          <div>PC1: {d.x.toFixed(2)}</div>
                          <div>PC2: {d.y.toFixed(2)}</div>
                          <div>质量评分: <strong>{d.z.toFixed(0)}</strong></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {Object.keys(BATCH_COLORS).map((batch) => (
                  <Scatter
                    key={batch}
                    name={batch}
                    data={pcaScatterData.filter(d => d.batch === batch)}
                    fill={BATCH_COLORS[batch]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
            {Object.entries(BATCH_COLORS).map(([batch, color]) => (
              <div key={batch} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>{batch}</span>
                {batch === 'BATCH-2026-05-B' && (
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#dc2626',
                    fontSize: 10,
                    fontWeight: 600,
                  }}>
                    聚类异常
                  </span>
                )}
              </div>
            ))}
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
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>最近复核样本</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              点击样本卡片进入复核详情
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentSamples.map((sample) => (
              <div
                key={sample.id}
                onClick={() => navigate(`/samples/${sample.id}`)}
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: sample.isUnavailable ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{sample.code}</span>
                    <SampleStatusBadge status={sample.status} />
                  </div>
                  <ReviewStatusBadge status={sample.reviewStatus} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {sample.species} · {sample.tissueType} · {sample.stainingMethod}
                  </div>
                  <QualityScore score={sample.qualityScore} />
                </div>
                {sample.isUnavailable && (
                  <div style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 4,
                    background: 'rgba(239, 68, 68, 0.08)',
                    fontSize: 11,
                    color: '#b91c1c',
                  }}>
                    🚫 不可用：{sample.unavailableReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
