import React from 'react';

export function StatusTag({ status }) {
  const map = {
    ready: { text: '可放行', cls: 'status-tag-ready' },
    pending: { text: '材料待补', cls: 'status-tag-pending' },
    expired: { text: '授权过期', cls: 'status-tag-expired' }
  };
  const cfg = map[status] || { text: '未确认', cls: 'status-tag-pending' };
  return <span className={cfg.cls}>{cfg.text}</span>;
}

export function SourceBadge({ source }) {
  if (!source) return null;
  return <span className="source-badge">来源: {source}</span>;
}

export function missingFields(rec) {
  const list = [];
  if (!rec.workTitle) list.push('作品名称');
  if (!rec.singerName) list.push('演唱者');
  if (!rec.shareRatio && rec.shareRatio !== 0) list.push('分账比例');
  if (!rec.authorizationExpiry) list.push('授权到期日');
  return list;
}

export function formatTime(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}
