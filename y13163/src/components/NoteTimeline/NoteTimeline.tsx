import { useMemo } from 'react';
import { MessageSquare, User, Cpu, ClipboardCheck, Clock, CheckCircle2, Send } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { sortNotesByTime, noteStatusLabels, noteStatusColors, getSourceLabel, getFieldMappingInfo } from '@/utils/notes';
import { formatTimestamp } from '@/utils/format';

const sourceIcons = {
  '现场老师': User,
  '自动监控系统': Cpu,
  '数据分析系统': Cpu,
  '气象预警系统': Cpu,
  '项目助理': ClipboardCheck,
  '系统自动': Cpu,
};

const statusIcons = {
  draft: Clock,
  submitted: Send,
  verified: CheckCircle2,
};

export default function NoteTimeline() {
  const { notes, selectedDataId, getRelatedNotes } = useDataStore();

  const displayNotes = useMemo(() => {
    if (selectedDataId) {
      const related = getRelatedNotes(selectedDataId);
      if (related.length > 0) {
        return sortNotesByTime(related, false);
      }
    }
    return sortNotesByTime(notes, false).slice(0, 8);
  }, [notes, selectedDataId, getRelatedNotes]);

  const getSourceIcon = (source: string) => {
    for (const [key, Icon] of Object.entries(sourceIcons)) {
      if (source.includes(key)) return Icon;
    }
    return MessageSquare;
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-glow" />
            <h4 className="text-white font-semibold">维修备注时间线</h4>
          </div>
          {selectedDataId && (
            <span className="text-xs text-cyan-glow">关联当前数据点 · {displayNotes.length}条</span>
          )}
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-auto">
        {displayNotes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {selectedDataId ? '当前数据点暂无关联备注' : '暂无维修备注'}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700/50"></div>
            
            {displayNotes.map((note, index) => {
              const SourceIcon = getSourceIcon(note.source);
              const StatusIcon = statusIcons[note.status];
              const fieldMapping = getFieldMappingInfo(note);
              const hasFieldMapping = fieldMapping.some((f) => f.standardField !== 'other');

              return (
                <div key={note.id} className="relative pl-12 pb-6 last:pb-0 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div
                    className="absolute left-3 w-4 h-4 rounded-full border-2 border-slate-800"
                    style={{ backgroundColor: noteStatusColors[note.status] }}
                  >
                    <StatusIcon className="w-2 h-2 text-white absolute top-0.5 left-0.5" />
                  </div>

                  <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <SourceIcon className="w-4 h-4 text-cyan-glow" />
                        <span className="text-sm text-white font-medium">{getSourceLabel(note.source)}</span>
                      </div>
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${noteStatusColors[note.status]}20`,
                          color: noteStatusColors[note.status],
                        }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {noteStatusLabels[note.status]}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 mb-2">{note.content}</p>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{formatTimestamp(note.timestamp)}</span>
                      {hasFieldMapping && (
                        <span className="text-cyan-glow/70">字段名已统一映射</span>
                      )}
                    </div>

                    {hasFieldMapping && (
                      <div className="mt-3 pt-3 border-t border-slate-700/30">
                        <div className="text-xs text-slate-500 mb-2">原始字段映射：</div>
                        <div className="space-y-1">
                          {fieldMapping
                            .filter((f) => f.standardField !== 'other')
                            .map((mapping, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                  {mapping.rawField}
                                </span>
                                <span className="text-slate-600">→</span>
                                <span className="px-2 py-0.5 rounded bg-cyan-glow/20 text-cyan-glow font-mono">
                                  {mapping.standardField}
                                </span>
                                <span className="text-slate-500 truncate flex-1">
                                  {mapping.rawValue.length > 30 ? mapping.rawValue.slice(0, 30) + '...' : mapping.rawValue}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
