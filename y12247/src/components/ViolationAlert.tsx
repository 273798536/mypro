import type { Violation } from '@/types';

interface ViolationAlertProps {
  violations: Violation[];
  onDismiss: () => void;
}

const SEVERITY_BG: Record<Violation['severity'], string> = {
  warning: 'bg-yellow-500/15 border-yellow-500/40',
  danger: 'bg-orange-500/15 border-orange-500/40',
  critical: 'bg-red-500/15 border-red-500/40',
};

const SEVERITY_TEXT: Record<Violation['severity'], string> = {
  warning: 'text-yellow-300',
  danger: 'text-orange-300',
  critical: 'text-red-300',
};

const RULE_ICON: Record<Violation['rule'], string> = {
  overload: '⚖️',
  gravity_shift: '↔️',
  ballast_omit: '💧',
  draft_exceed: '📏',
};

export default function ViolationAlert({ violations, onDismiss }: ViolationAlertProps) {
  if (violations.length === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 w-96 animate-slide-down">
      {violations.map((v, i) => (
        <div
          key={i}
          className={`rounded-lg border px-4 py-3 backdrop-blur-md ${SEVERITY_BG[v.severity]}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5">{RULE_ICON[v.rule]}</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${SEVERITY_TEXT[v.severity]}`}>
                {v.message}
              </p>
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={onDismiss}
        className="self-center text-xs text-slate-400 hover:text-slate-200 transition-colors mt-1"
      >
        关闭提示
      </button>
    </div>
  );
}
