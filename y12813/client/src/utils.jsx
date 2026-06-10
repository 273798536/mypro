import React from 'react'
import { Tag } from 'antd'

export const statusMap = {
  normal: { label: '正常', className: 'status-tag-normal', color: 'success' },
  boundary: { label: '边界', className: 'status-tag-boundary', color: 'warning' },
  bad: { label: '异常', className: 'status-tag-bad', color: 'error' },
  pending: { label: '待复核', className: 'status-tag-pending', color: 'default' },
}

export function StatusTag({ status }) {
  const cfg = statusMap[status] || statusMap.pending
  return <Tag className={cfg.className} color={cfg.color}>{cfg.label}</Tag>
}

export function formatDate(d) {
  if (!d) return '-'
  return String(d).replace('T', ' ').slice(0, 16)
}
