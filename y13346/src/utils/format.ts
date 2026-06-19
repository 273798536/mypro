import type { RiskLevel, ReviewStatus } from '../types'

export const riskLabel: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重风险',
}

export const statusLabel: Record<ReviewStatus, string> = {
  pending: '待审核',
  approved: '通过',
  rejected: '拒绝',
  suspended: '挂起',
  corrected: '人工修正',
}

export const riskColor: Record<RiskLevel, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#f43f5e',
}

export const statusColor: Record<ReviewStatus, string> = {
  pending: '#64748b',
  approved: '#10b981',
  rejected: '#f43f5e',
  suspended: '#8b5cf6',
  corrected: '#0ea5e9',
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}
