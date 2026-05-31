import React from 'react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: '正常', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '已结清', className: 'bg-slate-100 text-slate-700' },
  overdue: { label: '逾期', className: 'bg-red-100 text-red-700' },
  extended: { label: '已展期', className: 'bg-amber-100 text-amber-700' },
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: '待审批', className: 'bg-amber-100 text-amber-700' },
  approved: { label: '已批准', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已驳回', className: 'bg-red-100 text-red-700' },
  cancelled: { label: '已取消', className: 'bg-slate-200 text-slate-500' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status] || { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  )
}

interface RiskBadgeProps {
  type: string
  severity: string
  className?: string
}

const riskTypeMap: Record<string, string> = {
  repeated_extension: '重复展期',
  overdue_covering: '逾期遮盖',
  guarantee_expired: '担保过期',
}

const severityMap: Record<string, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-red-600 text-white' },
  medium: { label: '中', className: 'bg-amber-500 text-white' },
  low: { label: '低', className: 'bg-slate-400 text-white' },
}

export function RiskBadge({ type, severity, className }: RiskBadgeProps) {
  const typeLabel = riskTypeMap[type] || type
  const sevConfig = severityMap[severity] || severityMap.medium
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium', sevConfig.className, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
      {typeLabel}
      <span className="opacity-75">·{sevConfig.label}</span>
    </span>
  )
}

interface TagProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

export function Tag({ children, variant = 'default', className }: TagProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-blue-100 text-blue-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ children, variant = 'primary', size = 'md', loading = false, className, disabled, ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  )
}

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-card border border-slate-200',
        hover && 'hover:shadow-card-hover transition-shadow duration-300 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loading({ size = 'md', className }: LoadingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg className={cn('animate-spin text-slate-400', sizes[size])} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  )
}

interface EmptyProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function Empty({ icon, title, description, action, className }: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/50 transition-opacity" onClick={onClose}></div>
        <div className={cn('relative w-full max-w-lg rounded-lg bg-white shadow-xl animate-fade-in', className)}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 font-serif">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-4">{children}</div>
          {footer && (
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full px-3 py-2 border rounded-md text-sm',
            icon && 'pl-10',
            'focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
            error ? 'border-red-500' : 'border-slate-300',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          'w-full px-3 py-2 border rounded-md text-sm resize-none',
          'focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
          error ? 'border-red-500' : 'border-slate-300',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={cn(
          'w-full px-3 py-2 border rounded-md text-sm',
          'focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
          error ? 'border-red-500' : 'border-slate-300',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
