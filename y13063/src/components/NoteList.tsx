import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MOCK_POINTS } from '@/data/mockPoints';
import { NOTE_LABELS } from '@/types';
import type { NoteType } from '@/types';
import { Plus, Send, Trash2, Filter } from 'lucide-react';

export default function NoteList() {
  const notes = useAppStore((s) => s.notes);
  const addNote = useAppStore((s) => s.addNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const selectedId = useAppStore((s) => s.selectedPointId);
  const [type, setType] = useState<NoteType>('supplementary');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('阿宁');
  const [onlySelected, setOnlySelected] = useState(true);

  const displayNotes = useMemo(() => {
    const list = onlySelected && selectedId ? notes.filter((n) => n.pointId === selectedId) : notes;
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notes, selectedId, onlySelected]);

  function handleAdd() {
    if (!selectedId) {
      alert('请先在剖面图中选中一个点位');
      return;
    }
    if (!content.trim()) return;
    addNote(selectedId, type, content.trim(), author.trim() || '匿名');
    setContent('');
  }

  function pointCode(id: string) {
    return MOCK_POINTS.find((p) => p.id === id)?.code ?? id;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-brand-100 space-y-2 bg-brand-50/30">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-brand-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(e) => setOnlySelected(e.target.checked)}
              className="accent-brand-600"
            />
            <Filter className="w-3.5 h-3.5" />
            仅显示当前点位
          </label>
          <span className="text-xs text-brand-500">共 {displayNotes.length} 条</span>
        </div>

        <div className="space-y-2">
          <div className="flex gap-1">
            {(Object.keys(NOTE_LABELS) as NoteType[]).map((t) => {
              const m = NOTE_LABELS[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 text-xs py-1 rounded-sm border transition-colors ${
                    active
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="作者"
              className="w-20 px-2 py-1.5 text-sm border border-brand-200 rounded-sm focus:outline-none focus:border-brand-500"
            />
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={selectedId ? `为 ${pointCode(selectedId)} 添加备注...` : '请先选中点位'}
              className="flex-1 px-2 py-1.5 text-sm border border-brand-200 rounded-sm focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={handleAdd}
              disabled={!selectedId || !content.trim()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-2">
        {displayNotes.length === 0 ? (
          <div className="text-center text-brand-400 text-sm py-8">暂无备注</div>
        ) : (
          displayNotes.map((n) => {
            const m = NOTE_LABELS[n.type];
            return (
              <div
                key={n.id}
                className="card p-2.5 group border-l-4"
                style={{
                  borderLeftColor:
                    n.type === 'system'
                      ? '#0F4C5C'
                      : n.type === 'supplementary'
                      ? '#E36414'
                      : '#9A031E',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-brand-700">
                      {pointCode(n.pointId)}
                    </span>
                    <span className={`tag ${m.color} border-transparent`}>
                      {m.emoji} {m.label}
                    </span>
                  </div>
                  {n.type !== 'system' && (
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-accent-rust transition-opacity"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-brand-800">{n.content}</p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-brand-400">
                  <span>{n.author}</span>
                  <span>{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
