import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sampleApi } from '../api';
import { Sample, SampleStatus, ReviewStatus } from '../types';
import { SampleStatusBadge, ReviewStatusBadge, QualityScore } from '../components/Badges';

const statusFilters: { value: SampleStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  { value: 'normal', label: '正常样本' },
  { value: 'boundary', label: '边界样本' },
  { value: 'bad', label: '明显坏样本' },
];

const reviewFilters: { value: ReviewStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待复核' },
  { value: 'reviewing', label: '复核中' },
  { value: 'approved', label: '通过' },
  { value: 'flagged', label: '需关注' },
  { value: 'rejected', label: '不通过' },
];

export default function SampleList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>(
    (searchParams.get('status') as SampleStatus) || 'all'
  );
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | 'all'>('all');
  const [onlyUnavailable, setOnlyUnavailable] = useState(false);

  const loadSamples = async () => {
    setLoading(true);
    const params: any = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (reviewFilter !== 'all') params.reviewStatus = reviewFilter;
    if (onlyUnavailable) params.isUnavailable = true;
    const data = await sampleApi.getAll(params);
    setSamples(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSamples();
  }, [statusFilter, reviewFilter, onlyUnavailable]);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatusFilter(s as SampleStatus);
  }, [searchParams]);

  const filtered = keyword
    ? samples.filter(
        (s) =>
          s.name.includes(keyword) ||
          s.code.includes(keyword) ||
          s.batchId.includes(keyword) ||
          s.tissueType.includes(keyword)
      )
    : samples;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>样本管理</h3>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          按育种专员习惯准备：正常样本、边界样本、明显坏样本均已包含，方便快速验证工具运行状态
        </p>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              type="text"
              placeholder="搜索样本编号 / 名称 / 批次 / 组织类型..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid',
                  borderColor: statusFilter === f.value ? 'var(--color-primary)' : 'var(--color-border)',
                  background: statusFilter === f.value ? 'rgba(37, 99, 235, 0.08)' : 'var(--color-white)',
                  color: statusFilter === f.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value as ReviewStatus | 'all')}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)',
                fontSize: 13,
                background: 'var(--color-white)',
              }}
            >
              {reviewFilters.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              cursor: 'pointer',
              background: onlyUnavailable ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-white)',
              color: onlyUnavailable ? '#dc2626' : 'var(--color-text-secondary)',
            }}>
              <input
                type="checkbox"
                checked={onlyUnavailable}
                onChange={(e) => setOnlyUnavailable(e.target.checked)}
                style={{ margin: 0 }}
              />
              仅看不可用
            </label>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            共 <strong style={{ color: 'var(--color-text)' }}>{filtered.length}</strong> 条记录
          </span>
          {statusFilter === 'normal' && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: '#22c55e' }}>●</span> 用于验证工具对正常样本的检出能力
            </span>
          )}
          {statusFilter === 'boundary' && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: '#f59e0b' }}>●</span> 边界样本用于验证工具判断的灵敏度
            </span>
          )}
          {statusFilter === 'bad' && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: '#ef4444' }}>●</span> 明显坏样本验证工具是否能正确识别问题
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
        }}
      >
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>加载中...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={thStyle}>样本编号</th>
                  <th style={thStyle}>名称</th>
                  <th style={thStyle}>类型</th>
                  <th style={thStyle}>复核状态</th>
                  <th style={thStyle}>批次</th>
                  <th style={thStyle}>物种/组织</th>
                  <th style={thStyle}>质量评分</th>
                  <th style={thStyle}>接收日期</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sample, idx) => (
                  <tr
                    key={sample.id}
                    onClick={() => navigate(`/samples/${sample.id}`)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: sample.isUnavailable ? 'rgba(239, 68, 68, 0.03)' : idx % 2 === 0 ? 'transparent' : '#fafafa',
                    }}
                  >
                    <td style={tdStyle}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                      }}>
                        {sample.code}
                      </span>
                      {sample.isUnavailable && (
                        <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>🚫 不可用</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          flexShrink: 0,
                        }}>
                          🔬
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{sample.name}</span>
                      </div>
                    </td>
                    <td style={tdStyle}><SampleStatusBadge status={sample.status} /></td>
                    <td style={tdStyle}><ReviewStatusBadge status={sample.reviewStatus} /></td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 12,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontFamily: 'monospace',
                      }}>
                        {sample.batchId}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 13 }}>{sample.species}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{sample.tissueType}</div>
                    </td>
                    <td style={tdStyle}><QualityScore score={sample.qualityScore} /></td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {new Date(sample.receivedDate).toLocaleDateString('zh-CN')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/samples/${sample.id}`);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-primary)',
                          background: 'var(--color-primary)',
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        进入复核
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      暂无符合条件的样本
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'none',
  letterSpacing: 0,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 13,
  color: 'var(--color-text)',
  whiteSpace: 'nowrap',
};
