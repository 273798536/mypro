import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProcessingNote } from '@/types';
import { formatDateTime } from '@/data/mockData';
import { Cpu, User, Plus, Send } from 'lucide-react';

interface ProcessingNotesProps {
  notes: ProcessingNote[];
  onAddNote: (content: string, source: string) => void;
}

export function ProcessingNotes({ notes, onAddNote }: ProcessingNotesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [source, setSource] = useState('DBA-CurrentUser');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote.trim(), source);
    setNewNote('');
    setShowAddForm(false);
  };

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">处理意见</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md',
            'border border-slate-200 text-slate-700',
            'hover:bg-slate-100 transition-colors'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          添加备注
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-blue-50/50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">备注内容</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="请输入处理意见或备注..."
                className={cn(
                  'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
                  'bg-white focus:outline-none focus:ring-2 focus:ring-blue-200',
                  'resize-none min-h-[80px]'
                )}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1.5">操作人</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-blue-200'
                  )}
                />
              </div>
              <div className="flex items-center gap-2 self-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={cn(
                    'px-4 py-2 text-sm text-slate-600 rounded-md',
                    'hover:bg-slate-100 transition-colors'
                  )}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md',
                    'bg-slate-900 text-white',
                    'hover:bg-slate-800 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  提交
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-100">
        {sortedNotes.map((note) => (
          <div key={note.id} className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  note.type === 'system'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-blue-100 text-blue-600'
                )}
              >
                {note.type === 'system' ? (
                  <Cpu className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      note.type === 'system'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-100 text-blue-600'
                    )}
                  >
                    {note.type === 'system' ? '系统建议' : '人工备注'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {note.source}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
