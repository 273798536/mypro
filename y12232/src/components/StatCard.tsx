import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const colorMap = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary',
    value: 'text-primary',
    border: 'border-primary/10',
  },
  success: {
    bg: 'bg-green-50',
    icon: 'text-success',
    value: 'text-success-dark',
    border: 'border-success/10',
  },
  warning: {
    bg: 'bg-amber-50',
    icon: 'text-warning',
    value: 'text-warning-dark',
    border: 'border-warning/10',
  },
  danger: {
    bg: 'bg-red-50',
    icon: 'text-danger',
    value: 'text-danger-dark',
    border: 'border-danger/10',
  },
}

export default function StatCard({ title, value, icon: Icon, color, className }: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div
      className={cn(
        'card p-5 transition-shadow duration-200 hover:shadow-md',
        colors.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={cn('text-3xl font-mono font-bold', colors.value)}>
            {value.toLocaleString()}
          </p>
        </div>
        <div className={cn('p-2.5 rounded-lg', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
      </div>
    </div>
  )
}
