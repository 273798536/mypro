import { useMemo, useState } from 'react';
import { FileText, Search, Eye, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useReactorStore } from '@/store/useReactorStore';
import type { Verdict } from '@/types';
import { fmtDate, fmtRisk } from '@/utils/format';
import Button from '@/components/ui/Button';

interface ConclusionListProps {
  showOnlyPendingNotes?: boolean;
  onConfirmNote?: (noteId: string, verdict: Verdict) => void;
}

const verdictConfig: Record<Verdict, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  pass: { label: '通过', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', Icon: CheckCircle2 },
  fail: { label: '不通过', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30', Icon: XCircle },
  pending: { label: '待处理', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', Icon: AlertCircle },
};

export default function ConclusionList({ showOnlyPendingNotes = false, onConfirmNote }: ConclusionListProps) {
  const conclusions = useRecordsStore((s) => s.conclusions);
  const riskNotes = useRecordsStore((s) => s.riskNotes);
  const parts = useReactorStore((s) => s.parts);
  const jumpTo3D = useRecordsStore((s) => s.jumpTo3D);

  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingNotes = useMemo(() => {
    return riskNotes.filter(
      (n) => !n.is_misread && !n.conclusion_id
    );
  }, [riskNotes]);

  const displayConclusions = useMemo(() => {
    let items = conclusions;
    if (search) {
      items = items.filter(
        (c) =>
          c.summary.toLowerCase().includes(search.toLowerCase()) ||
          getPartName(c.part_id).toLowerCase().includes(search.toLowerCase())
      );
    }
    if (verdictFilter !== 'all') {
      items = items.filter((c) => c.verdict === verdictFilter);
    }
    return items.sort((a, b) => b.finalized_at - a.finalized_at);
  }, [conclusions, search, verdictFilter, parts]);

  function getPartName(partId: string): string {
    return parts.find((p) => p.id === partId)?.name || partId;
  }

  function handleJump(id: string) {
    const result = jumpTo3D(id);
    if (result) {
      const store = useReactorStore;
      store.getState().selectPart(result.partId);
    }
  }

  if (showOnlyPendingNotes) {
    return (
      <div className="h-full flex flex-col bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden">
        <div className="p-3 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            待确认备注
            <span className="ml-auto text-xs font-normal text-slate-500">
              {pendingNotes.length} 条待处理
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {pendingNotes.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-8">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-40 text-emerald-500" />
              全部已确认，暂无待处理项
            </div>
          ) : (
            pendingNotes.map((note) => {
              const risk = fmtRisk(note.level);
              return (
                <div
                  key={note.id}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 mt-0.5',
                        risk.cls
                      )}
                    >
                      {risk.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 leading-relaxed">{note.content}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                        <span className="truncate">{getPartName(note.part_id)}</span>
                        <span>·</span>
                        <span>{fmtDate(note.created_at)}</span>
                        <span>·</span>
                        <span>{note.created_by}</span>
                      </div>
                    </div>
                  </div>
                  {onConfirmNote && (
                    <div className="mt-2 pt-2 border-t border-slate-700/30 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1"
                        onClick={() => onConfirmNote(note.id, 'pass')}
                      >
                        <CheckCircle2 size={12} />
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        onClick={() => onConfirmNote(note.id, 'fail')}
                      >
                        <XCircle size={12} />
                        不通过
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <FileText size={16} className="text-cyan-400" />
          最终结论
          <span className="ml-auto text-xs font-normal text-slate-500">
            {displayConclusions.length} 条
          </span>
        </h2>

        <div className="relative mb-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜索结论或部件..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex gap-1">
          {(['all', 'pass', 'fail', 'pending'] as const).map((v) => {
            const label = v === 'all' ? '全部' : verdictConfig[v].label;
            return (
              <button
                key={v}
                onClick={() => setVerdictFilter(v)}
                className={cn(
                  'flex-1 px-2 py-1 text-[10px] font-medium rounded border transition-colors',
                  verdictFilter === v
                    ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {displayConclusions.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">
            <Plus size={32} className="mx-auto mb-2 opacity-40" />
            暂无结论记录
          </div>
        ) : (
          displayConclusions.map((conc) => {
            const verdict = verdictConfig[conc.verdict];
            const VerdictIcon = verdict.Icon;
            const isExpanded = expandedId === conc.id;
            const linkedNotes = riskNotes.filter((n) => conc.linked_note_ids.includes(n.id));
            return (
              <div
                key={conc.id}
                className={cn(
                  'rounded-lg border transition-all bg-slate-800/50 border-slate-700/50 hover:border-slate-600',
                  conc.is_supplement && 'border-dashed'
                )}
              >
                <div
                  className="p-2.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : conc.id)}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 mt-0.5',
                        verdict.cls
                      )}
                    >
                      <VerdictIcon size={10} />
                      {verdict.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 leading-relaxed">{conc.summary}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 flex-wrap">
                        <span className="truncate">{getPartName(conc.part_id)}</span>
                        <span>·</span>
                        <span>{fmtDate(conc.finalized_at)}</span>
                        <span>·</span>
                        <span>{conc.finalized_by}</span>
                        {conc.is_supplement && (
                          <>
                            <span>·</span>
                            <span className="text-cyan-400">补录</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-0 border-t border-slate-700/30">
                    <div className="pt-2 space-y-2">
                      {conc.supplements && (
                        <div className="bg-slate-900/50 rounded p-2">
                          <div className="text-[10px] text-cyan-400 mb-1">补录内容：</div>
                          <p className="text-xs text-slate-400 whitespace-pre-line">{conc.supplements}</p>
                        </div>
                      )}
                      {linkedNotes.length > 0 && (
                        <div>
                          <div className="text-[10px] text-slate-500 mb-1">关联备注 ({linkedNotes.length})：</div>
                          <div className="space-y-1">
                            {linkedNotes.map((note) => (
                              <div key={note.id} className="text-[11px] text-slate-400 bg-slate-900/30 rounded px-2 py-1">
                                · {note.content}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJump(conc.id);
                          }}
                        >
                          <Eye size={12} />
                          查看3D
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
