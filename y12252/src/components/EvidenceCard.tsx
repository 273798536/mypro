import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { CounterExample } from '@/types/game';
import { cn } from '@/lib/utils';

interface EvidenceCardProps {
  evidence: CounterExample;
  onStatusChange: (id: string, status: CounterExample['status']) => void;
}

const sourceLabel = { imported: '导入', discovered: '发现' } as const;
const sourceColor = {
  imported: 'bg-cyan-800/60 text-cyan-300',
  discovered: 'bg-purple-800/60 text-purple-300',
} as const;

const statusConfig = {
  unexcluded: {
    label: '未排除',
    icon: ShieldAlert,
    color: 'text-red-400',
    border: 'border-red-600/60',
    bg: 'bg-red-950/30',
    glow: 'shadow-red-900/20',
  },
  excluded: {
    label: '已排除',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    border: 'border-emerald-600/60',
    bg: 'bg-emerald-950/30',
    glow: 'shadow-emerald-900/20',
  },
  pending: {
    label: '待判定',
    icon: ShieldQuestion,
    color: 'text-amber-400',
    border: 'border-amber-600/60',
    bg: 'bg-amber-950/30',
    glow: 'shadow-amber-900/20',
  },
} as const;

const statusButtons: { key: CounterExample['status']; label: string }[] = [
  { key: 'excluded', label: '排除' },
  { key: 'unexcluded', label: '未排除' },
  { key: 'pending', label: '待判定' },
];

export default function EvidenceCard({ evidence, onStatusChange }: EvidenceCardProps) {
  const cfg = statusConfig[evidence.status];
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'rounded-md border p-3 transition-colors',
        cfg.border,
        'bg-gradient-to-br from-[#2a1a0e] to-[#1a0f06]',
        'shadow-md',
        cfg.glow
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <StatusIcon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.color)} />
        <p
          className="text-amber-50/85 text-xs leading-relaxed flex-1"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {evidence.content}
        </p>
      </div>

      {evidence.description && (
        <p className="text-amber-600/70 text-[10px] mb-2 pl-6 italic">
          {evidence.description}
        </p>
      )}

      <div className="flex items-center justify-between pl-6">
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
            sourceColor[evidence.source]
          )}
        >
          {sourceLabel[evidence.source]}
        </span>

        <div className="flex items-center gap-1">
          {statusButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => onStatusChange(evidence.id, btn.key)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all',
                evidence.status === btn.key
                  ? btn.key === 'excluded'
                    ? 'bg-emerald-700 text-emerald-100 shadow-sm shadow-emerald-800/40'
                    : btn.key === 'unexcluded'
                      ? 'bg-red-700 text-red-100 shadow-sm shadow-red-800/40'
                      : 'bg-amber-700 text-amber-100 shadow-sm shadow-amber-800/40'
                  : 'bg-amber-950/40 text-amber-600 hover:bg-amber-900/40 hover:text-amber-400'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
