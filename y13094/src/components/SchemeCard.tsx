import { AlertTriangle, FileText } from 'lucide-react';
import { CONCLUSION_LABELS } from '../../shared/types';
import type { SchemeListItem, ConclusionStatus, ListQuery } from '../../shared/types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSchemeStore } from '@/hooks/useSchemeStore';

const CONCLUSION_COLORS: Record<ConclusionStatus, string> = {
  pending: 'bg-[var(--color-info)]',
  approved: 'bg-[var(--color-success)]',
  rejected: 'bg-[var(--color-danger)]',
  revised: 'bg-[var(--color-accent)]',
};

const CONCLUSION_BORDER: Record<ConclusionStatus, string> = {
  pending: 'border-l-[var(--color-info)]',
  approved: 'border-l-[var(--color-success)]',
  rejected: 'border-l-[var(--color-danger)]',
  revised: 'border-l-[var(--color-accent)]',
};

function buildFilterSummary(f: ListQuery): string {
  const parts: string[] = [];
  if (f.bridgeTunnelName) parts.push(`桥隧:${f.bridgeTunnelName}`);
  if (f.schemeType) parts.push(`类型:${f.schemeType}`);
  if (f.conclusion) parts.push(`结论:${CONCLUSION_LABELS[f.conclusion as keyof typeof CONCLUSION_LABELS] || f.conclusion}`);
  if (f.hasGap === 'true') parts.push('仅缺段');
  if (f.dateFrom) parts.push(`从:${f.dateFrom}`);
  if (f.dateTo) parts.push(`至:${f.dateTo}`);
  return parts.join('+');
}

interface SchemeCardProps {
  item: SchemeListItem;
}

export default function SchemeCard({ item }: SchemeCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters } = useSchemeStore();

  const handleClick = () => {
    const summary = buildFilterSummary(filters);
    const query = summary ? `?f=${encodeURIComponent(summary)}` : '';
    navigate(`/scheme/${item.id}${query}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`animate-fade-in bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 ${CONCLUSION_BORDER[item.conclusion]} rounded-lg p-4 cursor-pointer hover:bg-[var(--color-surface-hover)] hover:shadow-lg hover:shadow-black/20 transition-all group relative`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText size={14} className="text-[var(--color-accent)]" />
            <span className="font-mono text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
              {item.schemeNo}
            </span>
          </div>
          <div className="text-sm font-medium text-[var(--color-text)] mb-1">
            {item.bridgeTunnelName}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] font-mono mb-2">
            {item.pointCoord}
          </div>
          {item.supplementaryNote && (
            <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg)] rounded px-2 py-1 line-clamp-1">
              📝 {item.supplementaryNote}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`${CONCLUSION_COLORS[item.conclusion]} text-white text-xs px-2 py-0.5 rounded font-medium`}>
            {CONCLUSION_LABELS[item.conclusion]}
          </span>
          {item.hasGap && (
            <span className="animate-pulse-warning flex items-center gap-1 bg-[var(--color-warning)]/20 text-[var(--color-warning)] text-xs px-2 py-0.5 rounded border border-[var(--color-warning)]/30">
              <AlertTriangle size={12} />
              缺段
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
