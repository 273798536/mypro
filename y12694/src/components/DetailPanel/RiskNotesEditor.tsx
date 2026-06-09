import { useState } from 'react';
import { MessageSquarePlus, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { RiskNote, Severity } from '@/types';
import { severityColor } from '@/utils/validation';
import { formatTimestamp } from '@/utils/timestamp';

interface RiskNotesEditorProps {
  recordId: string;
  notes: RiskNote[];
}

const severityOptions: { value: Severity; label: string; Icon: any }[] = [
  { value: 'low', label: '低', Icon: Info },
  { value: 'medium', label: '中', Icon: AlertTriangle },
  { value: 'high', label: '高', Icon: AlertCircle },
];

export const RiskNotesEditor = ({ recordId, notes }: RiskNotesEditorProps) => {
  const { addRiskNote } = useAppStore();
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [author, setAuthor] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    addRiskNote(recordId, {
      content: content.trim(),
      author: author.trim() || '匿名用户',
      severity,
    });
    setContent('');
    setAuthor('');
    setSeverity('medium');
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-700/50 bg-[#0F172A]/60 p-3">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquarePlus className="h-3.5 w-3.5 text-cyan-400" />
          <span
            className="text-[11px] font-semibold text-slate-200"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            新增风险备注
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入备注内容...（补录后3D渲染会同步更新）"
          className="w-full resize-none rounded-md border border-slate-700/60 bg-[#0B1026]/80 px-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
          rows={2}
        />
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="操作人"
            className="flex-1 rounded-md border border-slate-700/60 bg-[#0B1026]/80 px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400/50"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          <div className="flex rounded-md border border-slate-700/60 overflow-hidden">
            {severityOptions.map(({ value, label, Icon }) => {
              const active = severity === value;
              const color = severityColor[value];
              return (
                <button
                  key={value}
                  onClick={() => setSeverity(value)}
                  className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-all ${
                    active ? 'bg-slate-800' : 'hover:bg-slate-800/40'
                  }`}
                  style={{
                    color: active ? color : '#94A3B8',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="rounded-md bg-cyan-400/20 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition-all hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            添加
          </button>
        </div>
      </div>

      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => {
            const color = severityColor[note.severity];
            return (
              <div
                key={note.id}
                className="relative rounded-lg border border-slate-700/50 bg-[#0F172A]/50 p-3"
              >
                <div
                  className="absolute inset-y-0 left-0 w-0.5"
                  style={{ backgroundColor: color }}
                />
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        backgroundColor: `${color}1A`,
                        color,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {note.severity.toUpperCase()}
                    </span>
                    <span
                      className="text-[10px] font-medium text-slate-300"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {note.author}
                    </span>
                  </div>
                  <span
                    className="text-[9px] text-slate-500"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatTimestamp(note.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {note.content}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-4 text-center text-[11px] text-slate-600">
          暂无风险备注
        </div>
      )}
    </div>
  );
};
