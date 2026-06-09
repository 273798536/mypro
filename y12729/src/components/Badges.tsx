import type { ReactNode } from 'react';

interface StatusBadgeProps {
  status: 'normal' | 'pending' | 'bad_data';
  showLabel?: boolean;
}

const STATUS_MAP = {
  normal: { label: '正常', bg: 'bg-accent-green/20', text: 'text-accent-green', border: 'border-accent-green/40', dot: 'bg-accent-green' },
  pending: { label: '待确认', bg: 'bg-accent-amber/20', text: 'text-accent-amber', border: 'border-accent-amber/40', dot: 'bg-accent-amber' },
  bad_data: { label: '坏数据', bg: 'bg-accent-red/20', text: 'text-accent-red', border: 'border-accent-red/40', dot: 'bg-accent-red' },
};

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {showLabel && cfg.label}
    </span>
  );
}

interface ReviewBadgeProps {
  status?: 'approved' | 'rejected' | 'pending_review';
  reviewed: boolean;
}

export function ReviewBadge({ status, reviewed }: ReviewBadgeProps) {
  if (!reviewed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-400/20 text-neutral-200 border border-neutral-400/30">
        未复核
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-green/15 text-accent-green border border-accent-green/30">
        ✓ 已通过
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-red/15 text-accent-red border border-accent-red/30">
        ✕ 已打回
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
      ⋯ 复核中
    </span>
  );
}

interface DuplicateTagProps {
  score?: number;
}

export function DuplicateTag({ score }: DuplicateTagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-accent-red/20 text-accent-red border border-accent-red/40 duplicate-overlay">
      ⚠ 重复样本
      {score !== undefined && <span className="ml-0.5">({(score * 100).toFixed(0)}%)</span>}
    </span>
  );
}

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, actions, children, className = '' }: SectionCardProps) {
  return (
    <div className={`glass-panel rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-accent-cyan/10">
        <div className="flex items-center gap-2">
          {icon && <span className="text-accent-cyan">{icon}</span>}
          <h3 className="font-mono text-sm font-semibold text-neutral-50 tracking-wide">{title}</h3>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface PillButtonProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  count?: number;
}

export function PillButton({ active, onClick, children, count }: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border inline-flex items-center gap-1.5 ${
        active
          ? 'bg-accent-cyan/20 border-accent-cyan/50 text-accent-cyan shadow-[0_0_12px_rgba(0,180,216,0.2)]'
          : 'bg-deep-700/50 border-deep-600/50 text-neutral-200 hover:border-accent-cyan/30 hover:text-neutral-50'
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            active ? 'bg-accent-cyan/30 text-accent-cyan-light' : 'bg-deep-600/50 text-neutral-200'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface PrimaryButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PrimaryButton({ onClick, children, variant = 'primary', icon, disabled, className = '' }: PrimaryButtonProps) {
  const styles = {
    primary: 'bg-accent-cyan hover:bg-accent-cyan-light text-deep-900 border-accent-cyan hover:border-accent-cyan-light shadow-[0_0_16px_rgba(0,180,216,0.35)]',
    danger: 'bg-accent-red hover:bg-accent-red-light text-white border-accent-red hover:border-accent-red-light',
    ghost: 'bg-transparent hover:bg-deep-600/50 text-neutral-100 border-deep-600 hover:border-accent-cyan/40',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
}

export function TeachingHint({ children }: { children: ReactNode }) {
  return (
    <div className="relative pl-5 py-2 pr-4 rounded-lg bg-accent-cyan/8 border border-accent-cyan/25">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-accent-cyan/60" />
      <div className="flex items-start gap-2">
        <span className="text-accent-cyan text-xs font-mono mt-0.5 shrink-0">💡 用于讲解</span>
        <p className="text-sm text-neutral-100 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

export function ExplanationBox({ summary, children }: { summary: string; children?: ReactNode }) {
  return (
    <div className="bg-deep-800/80 rounded-lg p-4 border border-deep-600/60">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-accent-cyan font-mono text-xs mt-0.5">// 结论</span>
        <p className="text-sm font-medium text-neutral-50 leading-relaxed">{summary}</p>
      </div>
      {children}
    </div>
  );
}
