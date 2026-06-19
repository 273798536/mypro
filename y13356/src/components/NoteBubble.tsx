import type { Note } from '@/types';
import { formatDateTime } from '@/utils/date';
import { User } from 'lucide-react';

interface NoteBubbleProps {
  note: Note;
  isStepNote?: boolean;
}

const NoteBubble: React.FC<NoteBubbleProps> = ({ note, isStepNote = false }) => {
  const getInitial = (name: string) => {
    return name.slice(0, 1);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-emerald-400 to-emerald-600',
      'from-amber-400 to-amber-600',
      'from-rose-400 to-rose-600',
      'from-violet-400 to-violet-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className={`flex gap-3 ${isStepNote ? 'mt-3' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
          note.createdBy
        )} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
      >
        {getInitial(note.createdBy)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl rounded-tl-sm border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-900">{note.createdBy}</span>
            <span className="text-xs text-slate-400">{formatDateTime(note.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {note.content}
          </p>
        </div>
      </div>
    </div>
  );
};

interface NoteListProps {
  notes: Note[];
  emptyText?: string;
}

export const NoteList: React.FC<NoteListProps> = ({ notes, emptyText = '暂无备注' }) => {
  if (notes.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <NoteBubble key={note.id} note={note} />
      ))}
    </div>
  );
};

export default NoteBubble;
