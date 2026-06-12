import { useState } from 'react';
import { MessageSquarePlus, Send, Bot, User } from 'lucide-react';
import type { Declaration, ReviewNote, ReviewNoteType } from '@/types';
import { useDeclarationStore } from '@/stores/useDeclarationStore';

interface Props {
  declaration: Declaration;
}

const typeIcons: Record<ReviewNoteType, React.ReactNode> = {
  manual: <User className="w-3.5 h-3.5" />,
  'auto-risk-change': <Bot className="w-3.5 h-3.5" />,
  'auto-boundary-detect': <Bot className="w-3.5 h-3.5" />,
  'auto-weather-gap': <Bot className="w-3.5 h-3.5" />,
};

const typeColors: Record<ReviewNoteType, string> = {
  manual: 'bg-ocean-800',
  'auto-risk-change': 'bg-amber-500',
  'auto-boundary-detect': 'bg-orange-500',
  'auto-weather-gap': 'bg-green-500',
};

const typeLabels: Record<ReviewNoteType, string> = {
  manual: '人工备注',
  'auto-risk-change': '风险变更',
  'auto-boundary-detect': '边界检测',
  'auto-weather-gap': '气象缺口',
};

export default function ReviewNoteTimeline({ declaration }: Props) {
  const [newNote, setNewNote] = useState('');
  const addReviewNote = useDeclarationStore(s => s.addReviewNote);

  const handleAdd = () => {
    if (!newNote.trim()) return;
    addReviewNote(declaration.id, {
      author: '张场长',
      content: newNote.trim(),
      type: 'manual',
    });
    setNewNote('');
  };

  return (
    <div className="card-ocean p-4">
      <h3 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-ocean-800 rounded-full" />
        复核备注
      </h3>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {declaration.reviewNotes.map((note) => (
          <NoteItem key={note.id} note={note} />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="添加复核备注..."
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            disabled={!newNote.trim()}
            className="px-3 py-2 bg-ocean-800 text-white rounded-lg text-xs font-medium hover:bg-ocean-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            添加
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteItem({ note }: { note: ReviewNote }) {
  const isAuto = note.type !== 'manual';
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-0.5 ${typeColors[note.type]}`}>
        {typeIcons[note.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-slate-700">{note.author}</span>
          <span className="text-[10px] text-slate-400">{note.timestamp}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${isAuto ? 'bg-slate-100 text-slate-500' : 'bg-ocean-50 text-ocean-600'}`}>
            {typeLabels[note.type]}
          </span>
        </div>
        <p className="text-xs text-slate-600">{note.content}</p>
        {note.snapshot && (
          <div className="mt-1.5 bg-slate-50 border border-slate-100 rounded p-2 text-[10px] text-slate-500 font-mono space-y-0.5">
            <div>风险等级：{note.snapshot.level}</div>
            <div>盐度达标：{note.snapshot.salinityCompliant ? '✅' : '❌'} · 交换率达标：{note.snapshot.exchangeRateCompliant ? '✅' : '❌'}</div>
            <div>气象条件：{note.snapshot.weatherCondition} · 潮位匹配：{note.snapshot.tideMatch ? '✅' : '❌'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
