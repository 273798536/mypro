import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface NoteEditorProps {
  objectId: string;
  sourceColor: string;
}

export default function NoteEditor({ objectId, sourceColor }: NoteEditorProps) {
  const { addNote, notes } = useAppStore();
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('阿宁');
  const objectNotes = notes.filter((n) => n.objectId === objectId);

  const handleSubmit = () => {
    if (content.trim()) {
      addNote(objectId, content.trim(), author.trim() || '阿宁');
      setContent('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="添加口头备注..."
          className="w-full bg-slate-800/60 border border-slate-700 rounded px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 resize-none"
          rows={3}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="作者"
            className="flex-1 bg-slate-800/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-24"
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-medium rounded px-4 py-2 transition-colors"
          >
            添加备注
          </button>
        </div>
      </div>

      {objectNotes.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            历史备注 ({objectNotes.length})
          </div>
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-700" />
            {objectNotes.map((note) => {
              return (
                <div key={note.id} className="relative mb-3">
                  <div
                    className="absolute -left-2.5 top-2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: sourceColor }}
                  />
                  <div
                    className="bg-slate-800/60 rounded p-3 border border-slate-700/50"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: sourceColor,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-200">{note.author}</span>
                      <span className="text-xs text-slate-500">{note.createdAt}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
