import type { PromptVersion } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  versions: PromptVersion[];
  valueA: number | null;
  valueB: number | null;
  onChangeA: (n: number | null) => void;
  onChangeB: (n: number | null) => void;
}

export default function VersionSelector({ versions, valueA, valueB, onChangeA, onChangeB }: Props) {
  const Option = ({ v, side, selected, onChange, disabled }: {
    v: PromptVersion; side: 'A' | 'B'; selected: boolean; onChange: () => void; disabled?: boolean;
  }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all mb-2 ${selected
        ? side === 'A'
          ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
          : 'border-status-approved bg-status-approved/10 ring-1 ring-status-approved/40'
        : 'border-border bg-bg-tertiary hover:border-accent/40'} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold font-mono ${side === 'A' ? 'bg-accent/30 text-accent' : 'bg-status-approved/30 text-status-approved'}`}>{side}</span>
          <span className="font-mono text-sm font-semibold">{v.version_tag}</span>
        </div>
        <span className="text-[10px] text-text-secondary font-mono">{new Date(v.created_at).toLocaleDateString()}</span>
      </div>
      {v.change_log && <div className="text-[11px] text-text-secondary mt-1">{v.change_log}</div>}
      <div className="mt-1.5 text-[10px] text-text-secondary font-mono">
        安全规则: {(v.safety_rules_snapshot?.rules?.length ?? 0)} 条
      </div>
    </button>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-text-secondary">版本 A · 对照组</div>
        {versions.map(v => (
          <Option
            key={`A-${v.id}`}
            v={v} side="A" selected={valueA === v.id}
            onChange={() => onChangeA(valueA === v.id ? null : v.id)}
            disabled={valueB === v.id}
          />
        ))}
      </div>
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-text-secondary">版本 B · 实验组</div>
        {versions.map(v => (
          <Option
            key={`B-${v.id}`}
            v={v} side="B" selected={valueB === v.id}
            onChange={() => onChangeB(valueB === v.id ? null : v.id)}
            disabled={valueA === v.id}
          />
        ))}
      </div>
    </div>
  );
}
