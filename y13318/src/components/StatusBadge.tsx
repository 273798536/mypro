import type { Sample } from '@/types';
import { statusText } from '@/lib/confusion';

export function StatusBadge({ sample }: { sample: Sample }) {
  const t = statusText(sample);
  const cls =
    t === '通过'
      ? 'border-pass/40 bg-pass/10 text-pass'
      : t === '误判'
        ? 'border-fail/40 bg-fail/10 text-fail'
        : 'border-amberx-500/40 bg-amberx-500/10 text-amberx-400';
  return <span className={`chip ${cls}`}>{t}</span>;
}

export function Dot({ sample }: { sample: Sample }) {
  const t = statusText(sample);
  const color = t === '通过' ? 'bg-pass' : t === '误判' ? 'bg-fail' : 'bg-amberx-500';
  return <span className={`inline-block h-2 w-2 ${color}`} />;
}
