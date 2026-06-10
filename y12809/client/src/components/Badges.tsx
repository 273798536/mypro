import { SampleStatus, ReviewStatus } from '../types';

const statusConfig: Record<SampleStatus, { label: string; color: string; bg: string }> = {
  normal: { label: '正常样本', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  boundary: { label: '边界样本', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  bad: { label: '明显坏样本', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
};

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: 12,
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
        gap: 6,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.color,
        }}
      />
      {cfg.label}
    </span>
  );
}

const reviewConfig: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待复核', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' },
  reviewing: { label: '复核中', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  approved: { label: '复核通过', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  rejected: { label: '复核不通过', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
  flagged: { label: '需关注', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const cfg = reviewConfig[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: 12,
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.bg}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

export function QualityScore({ score }: { score: number }) {
  let color = '#16a34a';
  if (score < 50) color = '#dc2626';
  else if (score < 70) color = '#d97706';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 60,
          height: 6,
          borderRadius: '3px',
          background: '#f3f4f6',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}

export const categoryColors: Record<string, string> = {
  tumor: '#ef4444',
  normal: '#22c55e',
  necrosis: '#a855f7',
  inflammation: '#f59e0b',
  artifact: '#6b7280',
  other: '#3b82f6',
};

export const categoryLabels: Record<string, string> = {
  tumor: '肿瘤区域',
  normal: '正常组织',
  necrosis: '坏死区域',
  inflammation: '炎症区域',
  artifact: '伪影',
  other: '其他',
};

export function CategoryTag({ category }: { category: string }) {
  const color = categoryColors[category] || '#3b82f6';
  const label = categoryLabels[category] || category;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: 11,
        fontWeight: 500,
        color: color,
        background: `${color}1a`,
        gap: 4,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '2px',
          background: color,
        }}
      />
      {label}
    </span>
  );
}
