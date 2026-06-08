import { useMemo, useState } from 'react';
import { AlertTriangle, Search, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useReactorStore } from '@/store/useReactorStore';
import type { RiskLevel, MisreadReason } from '@/types';
import { fmtRisk, fmtDate } from '@/utils/format';
import Button from '@/components/ui/Button';

interface RiskNoteListProps {
  showMisread?: boolean;
  compact?: boolean;
  onConfirm?: (noteId: string, verdict: 'pass' | 'fail') => void;
  onMarkMisread?: (noteId: string, reason: MisreadReason) => void;
}

const misreadLabels: Record<Exclude<MisreadReason, null>, string> = {
  occlusion: '遮挡误读',
  timing_mismatch: '时机不匹配',
  other: '其他原因',
};

export default function RiskNoteList({
  showMisread = false,
  compact = false,
  onConfirm,
  onMarkMisread,
}: RiskNoteListProps) {
  const riskNotes = useRecordsStore((s) => s.riskNotes);
  const markMisread = useRecordsStore((s) => s.markMisread);
  const parts = useReactorStore((s) => s.parts);
  const jumpTo3D = useRecordsStore((s) => s.jumpTo3D);

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<RiskLevel | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayNotes = useMemo(() => {
    let notes = riskNotes;
    if (!showMisread) {
      notes = notes.filter((n) => !n.is_misread);
    }
    if (search) {
      notes = notes.filter(
        (n) =>
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          getPartName(n.part_id).toLowerCase().includes(search.toLowerCase())
      );
    }
    if (levelFilter !== 'all') {
      notes = notes.filter((n) => n.level === levelFilter);
    }
    return notes.sort((a, b) => b.created_at - a.created_at);
  }, [riskNotes, showMisread, search, levelFilter, parts]);

  function getPartName(partId: string): string {
    return parts.find((p) => p.id === partId)?.name || partId;
  }

  function handleJump(noteId: string) {
    const result = jumpTo3D(noteId);
    if (result) {
      const store = useReactorStore;
      store.getState().selectPart(result.partId);
      if (result.clip.enabled) {
        if (!store.getState().clipPlanes.enabled) {
          store.getState().toggleClipEnabled();
        }
        store.getState().setClip('x', result.clip.x);
        store.getState().setClip('y', result.clip.y);
        store.getState().setClip('z', result.clip.z);
      }
    }
  }

  const handleMisread = onMarkMisread || markMisread;

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          风险备注
          <span className="ml-auto text-xs font-normal text-slate-500">
            {displayNotes.length} 条
          </span>
        </h2>

        {!compact && (
          <>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="搜索备注内容或部件..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex gap-1">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => {
                const label = level === 'all' ? '全部' : fmtRisk(level).label;
                return (
                  <button
                    key={level}
                    onClick={() => setLevelFilter(level)}
                    className={cn(
                      'flex-1 px-2 py-1 text-[10px] font-medium rounded border transition-colors',
                      levelFilter === level
                        ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {displayNotes.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">暂无风险备注</div>
        ) : (
          displayNotes.map((note) => {
            const risk = fmtRisk(note.level);
            const isExpanded = expandedId === note.id;
            return (
              <div
                key={note.id}
                className={cn(
                  'rounded-lg border transition-all',
                  note.is_misread
                    ? 'bg-slate-800/30 border-slate-700/30 opacity-60'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600',
                  note.is_duplicate && 'border-dashed'
                )}
              >
                <div
                  className="p-2.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
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
                      <p
                        className={cn(
                          'text-xs leading-relaxed',
                          note.is_misread ? 'text-slate-500 line-through' : 'text-slate-200'
                        )}
                      >
                        {note.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                        <span className="truncate">{getPartName(note.part_id)}</span>
                        <span>·</span>
                        <span>{fmtDate(note.created_at)}</span>
                        {note.is_duplicate && (
                          <>
                            <span>·</span>
                            <span className="text-amber-500">重复</span>
                          </>
                        )}
                        {note.is_misread && (
                          <>
                            <span>·</span>
                            <span className="text-slate-400">
                              已排除: {note.misread_reason && misreadLabels[note.misread_reason]}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-0 border-t border-slate-700/30">
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJump(note.id);
                        }}
                      >
                        <Eye size={12} />
                        查看3D
                      </Button>
                      {!note.is_misread && onConfirm && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirm(note.id, 'pass');
                            }}
                          >
                            <CheckCircle2 size={12} />
                            确认通过
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirm(note.id, 'fail');
                            }}
                          >
                            <XCircle size={12} />
                            确认不通过
                          </Button>
                        </>
                      )}
                      {!note.is_misread && (
                        <div className="flex gap-1 ml-auto">
                          {(Object.keys(misreadLabels) as Exclude<MisreadReason, null>[]).map(
                            (reason) => (
                              <Button
                                key={reason}
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMisread(note.id, reason);
                                }}
                                title={`标记为误读: ${misreadLabels[reason]}`}
                              >
                                <EyeOff size={12} />
                                {misreadLabels[reason]}
                              </Button>
                            )
                          )}
                        </div>
                      )}
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
