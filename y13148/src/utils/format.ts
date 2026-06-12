import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN })
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return formatDate(dateStr)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (value === 0) return '0'
  if (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-3) {
    return value.toExponential(decimals)
  }
  return parseFloat(value.toFixed(decimals)).toString()
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}
