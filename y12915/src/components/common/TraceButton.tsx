import type { EvaluationSample } from '@/types';

interface TraceButtonProps {
  sample: EvaluationSample;
  onTrace: (sample: EvaluationSample) => void;
  className?: string;
}

export default function TraceButton({ sample, onTrace, className }: TraceButtonProps) {
  return (
    <button
      onClick={() => onTrace(sample)}
      title="追溯详情"
      className={
        'inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-colors ' +
        (className ?? '')
      }
    >
      📎
    </button>
  );
}
