import type { OperationRecord, EvidenceLink, Clue } from '@/types';
import { getSourceTypeLabel, getCategoryLabel } from '@/utils/evidenceValidator';
import {
  Pin,
  Link2,
  Unlink,
  FileCheck,
  Eye,
  ChevronRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface TimelineProps {
  history: OperationRecord[];
  clues: Clue[];
  links: EvidenceLink[];
}

export default function Timeline({ history, clues, links }: TimelineProps) {
  const getIcon = (type: OperationRecord['type']) => {
    switch (type) {
      case 'MARK_CLUE':
        return <Pin size={14} className="text-amber-400" />;
      case 'UNMARK_CLUE':
        return <Pin size={14} className="text-slate-500" />;
      case 'CREATE_LINK':
        return <Link2 size={14} className="text-emerald-400" />;
      case 'DELETE_LINK':
        return <Unlink size={14} className="text-red-400" />;
      case 'SUBMIT_CONCLUSION':
        return <FileCheck size={14} className="text-blue-400" />;
      case 'VIEW_MATERIAL':
        return <Eye size={14} className="text-slate-400" />;
      default:
        return <Minus size={14} className="text-slate-500" />;
    }
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0) return <TrendingUp size={12} className="text-emerald-400" />;
    if (impact < 0) return <TrendingDown size={12} className="text-red-400" />;
    return null;
  };

  const getClueInfo = (clueId?: string) => {
    if (!clueId) return null;
    const clue = clues.find((c) => c.id === clueId);
    if (!clue) return null;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-400">
        {getCategoryLabel(clue.category)} · {getSourceTypeLabel(clue.sourceType)}
      </span>
    );
  };

  const getLinkInfo = (linkId?: string) => {
    if (!linkId) return null;
    const link = links.find((l) => l.id === linkId);
    if (!link) return null;
    const from = clues.find((c) => c.id === link.fromClueId);
    const to = clues.find((c) => c.id === link.toClueId);
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-900/30 text-emerald-300">
        {from ? getCategoryLabel(from.category) : '?'} ↔ {to ? getCategoryLabel(to.category) : '?'}
        {link.isValid ? ' ✓' : ' ✗'}
      </span>
    );
  };

  return (
    <div className="space-y-0">
      {history.map((record, index) => (
        <div key={record.id} className="relative flex gap-3">
          {index < history.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-700/50" />
          )}

          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center mt-0.5 z-10">
            {getIcon(record.type)}
          </div>

          <div className="flex-1 pb-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 leading-relaxed">{record.detail}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock size={10} />
                    {new Date(record.timestamp).toLocaleTimeString('zh-CN')}
                  </span>
                  {record.scoreImpact !== 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-medium ${
                        record.scoreImpact > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {getImpactIcon(record.scoreImpact)}
                      {record.scoreImpact > 0 ? '+' : ''}
                      {record.scoreImpact}分
                    </span>
                  )}
                  {getClueInfo(record.clueId)}
                  {getLinkInfo(record.linkId)}
                </div>
              </div>

              {index < history.length - 1 && (
                <ChevronRight size={12} className="text-slate-600 flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
