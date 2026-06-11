import { useMemo } from 'react';
import { Dna, Thermometer, MapPin, Package, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { PrimerPair, Mutation, ReferenceSequence } from '@/lib/utils/types';
import { cn } from '@/lib/utils';

interface PrimerDetailProps {
  primerPair: PrimerPair;
  reference?: ReferenceSequence;
  mutations?: Mutation[];
  className?: string;
}

const THREE_PRIME_BASES = 3;

const BASE_COLORS: Record<string, string> = {
  A: '#3B82F6', T: '#EF4444', G: '#10B981', C: '#F59E0B', N: '#6B7280', '-': '#9CA3AF',
};

const STATUS_CONFIG: Record<PrimerPair['status'], { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  valid: { label: '有效', bg: 'bg-success-100', text: 'text-success-700', icon: CheckCircle2 },
  warning: { label: '警告', bg: 'bg-warning-100', text: 'text-warning-700', icon: AlertCircle },
  invalid: { label: '无效', bg: 'bg-danger-100', text: 'text-danger-700', icon: AlertCircle },
  needs_review: { label: '需审核', bg: 'bg-brand-100', text: 'text-brand-700', icon: AlertCircle },
};

export default function PrimerDetail({ primerPair, reference, mutations = [], className }: PrimerDetailProps) {
  const statusConfig = STATUS_CONFIG[primerPair.status];
  const StatusIcon = statusConfig.icon;

  const forwardMutations = useMemo(
    () => mutations.filter(
      (m) => m.position >= primerPair.forward.bindingStart && m.position <= primerPair.forward.bindingEnd
    ),
    [mutations, primerPair.forward]
  );
  const reverseMutations = useMemo(
    () => mutations.filter(
      (m) => m.position >= primerPair.reverse.bindingStart && m.position <= primerPair.reverse.bindingEnd
    ),
    [mutations, primerPair.reverse]
  );

  const getRefSeq = (start: number, end: number) =>
    reference ? reference.sequence.substring(Math.max(0, start - 1), Math.min(reference.length, end)) : null;

  const formatPos = (pos: number) => (pos >= 1000 ? `${(pos / 1000).toFixed(2)}kb` : `${pos}bp`);

  const renderAlignment = (
    primerSeq: string,
    refStart: number,
    refEnd: number,
    direction: 'forward' | 'reverse',
    pMutations: Mutation[]
  ) => {
    const refSeq = getRefSeq(refStart, refEnd);
    const len = primerSeq.length;
    const displaySeq = refSeq?.substring(0, len) || '-'.repeat(len);
    const mismatches: number[] = [];
    for (let i = 0; i < len; i++) {
      if (displaySeq[i] && primerSeq[i] !== displaySeq[i]) mismatches.push(i);
    }

    const threeStart = direction === 'forward' ? len - THREE_PRIME_BASES : 0;
    const threeEnd = direction === 'forward' ? len : THREE_PRIME_BASES;
    const baseW = 20;
    const seqW = len * baseW;
    const isThree = (i: number) => i >= threeStart && i < threeEnd;

    return (
      <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'rounded px-2 py-0.5 text-xs font-medium',
              direction === 'forward' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            )}>
              {direction === 'forward' ? '正向引物' : '反向引物'}
            </span>
            <span className="text-xs text-neutral-500">{formatPos(refStart)} - {formatPos(refEnd)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {mismatches.length > 0 && <span className="text-danger-600">{mismatches.length} 错配</span>}
            {pMutations.length > 0 && <span className="text-warning-600">{pMutations.length} 突变</span>}
          </div>
        </div>

        <svg width={seqW + 40} height="110" className="overflow-visible">
          <g transform="translate(20, 0)">
            <text x="-10" y="20" textAnchor="end" className="fill-neutral-500" fontSize="10">参考</text>
            {displaySeq.split('').map((base, i) => (
              <g key={`r-${i}`} transform={`translate(${i * baseW}, 8)`}>
                {isThree(i) && <rect x="0" y="0" width={baseW - 2} height="20" rx="2" fill="#FEF3C7" />}
                <text x={(baseW - 2) / 2} y="15" textAnchor="middle" fill={BASE_COLORS[base] || '#6B7280'}
                  fontSize="12" fontWeight="600" fontFamily="monospace">{base}</text>
              </g>
            ))}

            {primerSeq.split('').map((base, i) => {
              const mm = mismatches.includes(i);
              const hasMut = pMutations.some((m) => m.position === refStart + i);
              return (
                <g key={`p-${i}`} transform={`translate(${i * baseW}, 38)`}>
                  {isThree(i) && <rect x="0" y="0" width={baseW - 2} height="20" rx="2" fill="#FDE68A" opacity="0.7" />}
                  {mm && <rect x="0" y="0" width={baseW - 2} height="20" rx="2" fill="#FEE2E2" />}
                  {hasMut && <circle cx={(baseW - 2) / 2} cy="-4" r="3" fill="#EB3B5A" />}
                  <text x={(baseW - 2) / 2} y="15" textAnchor="middle"
                    fill={mm ? '#DC2626' : BASE_COLORS[base] || '#6B7280'}
                    fontSize="12" fontWeight="600" fontFamily="monospace"
                    textDecoration={mm ? 'underline' : 'none'}>{base}</text>
                </g>
              );
            })}

            <text x="-10" y="85" textAnchor="end" className="fill-neutral-400" fontSize="9">位置</text>
            {Array.from({ length: len }).map((_, i) => {
              if (i !== 0 && i !== len - 1 && i % 5 !== 0) return null;
              return (
                <text key={`pos-${i}`} x={i * baseW + (baseW - 2) / 2} y="85" textAnchor="middle"
                  className="fill-neutral-400" fontSize="9" fontFamily="monospace">{refStart + i}</text>
              );
            })}
          </g>
        </svg>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-200"></span>3'端区域</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-100"></span>错配位置</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>突变位点</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
          <Dna className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{primerPair.name}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium', statusConfig.bg, statusConfig.text)}>
              <StatusIcon className="h-3 w-3" />{statusConfig.label}
            </span>
            {primerPair.batch && (
              <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                <Package className="h-3 w-3" />{primerPair.batch}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-center gap-2 text-xs text-neutral-500"><MapPin className="h-3.5 w-3.5" />覆盖区间</div>
          <div className="mt-1 font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {formatPos(primerPair.ampliconStart)}
            <ArrowRight className="mx-1 inline h-3 w-3 text-neutral-400" />
            {formatPos(primerPair.ampliconEnd)}
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">产物: {primerPair.productSize}bp</div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-center gap-2 text-xs text-neutral-500"><Thermometer className="h-3.5 w-3.5" />Tm 值</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold text-blue-600">{primerPair.forward.tm.toFixed(1)}°C</span>
            <span className="text-xs text-neutral-400">/</span>
            <span className="font-mono text-sm font-semibold text-purple-600">{primerPair.reverse.tm.toFixed(1)}°C</span>
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">正/反向引物</div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="text-xs text-neutral-500">GC 含量</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {(primerPair.forward.gcContent * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-neutral-400">/</span>
            <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {(primerPair.reverse.gcContent * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">长度: {primerPair.forward.length}/{primerPair.reverse.length}bp</div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="text-xs text-neutral-500">突变影响</div>
          <div className="mt-1">
            {forwardMutations.length + reverseMutations.length > 0 ? (
              <span className="font-semibold text-danger-600">{forwardMutations.length + reverseMutations.length} 个位点</span>
            ) : (
              <span className="font-semibold text-success-600">无影响</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">正向 {forwardMutations.length} / 反向 {reverseMutations.length}</div>
        </div>
      </div>

      {renderAlignment(primerPair.forward.sequence, primerPair.forward.bindingStart, primerPair.forward.bindingEnd, 'forward', forwardMutations)}
      {renderAlignment(primerPair.reverse.sequence, primerPair.reverse.bindingStart, primerPair.reverse.bindingEnd, 'reverse', reverseMutations)}

      {primerPair.notes && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300">
          <span className="font-medium">备注: </span>{primerPair.notes}
        </div>
      )}
    </div>
  );
}
