import { useState } from 'react';
import { MessageSquare, Bot, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/utils/formatters';
import { CopyButton } from '@/components/common/CopyButton';

interface CustomerNoteListProps {
  refundOrderId: string;
}

export function CustomerNoteList({ refundOrderId }: CustomerNoteListProps) {
  const customerNotes = useAppStore(state => 
    state.customerNotes.filter(n => n.refundOrderId === refundOrderId)
  );

  const addCustomerNote = useAppStore(state => state.addCustomerNote);
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addCustomerNote(refundOrderId, newNote.trim());
    setNewNote('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <h3 className="font-mono font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare size={18} className="text-amber-600" />
          客服备注（{customerNotes.length}）
          <span className="text-xs text-amber-600 font-normal">* 原始名称保留，不可篡改
          </span>
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm font-mono text-amber-600 hover:text-amber-700 transition-colors"
        >
          {isAdding ? '取消' : '+ 添加备注'}
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="输入备注内容..."
            rows={3}
            className="w-full px-3 py-2 border-2 border-slate-300 rounded font-mono text-sm focus:border-amber-500 focus:outline-none transition-colors resize-none mb-2"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-mono text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="px-3 py-1.5 text-xs font-mono font-medium text-white bg-amber-600 border border-amber-700 rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {customerNotes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4 font-mono">
            暂无备注
          </p>
        ) : (
          customerNotes.map(note => (
            <div
              key={note.id}
              className={`p-3 rounded border ${
                note.isSystemGenerated
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                note.isSystemGenerated
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-amber-100 text-amber-600'
              }`}>
                {note.isSystemGenerated ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-medium text-slate-700">
                    {note.operatorOriginalName}
                    <span className="ml-1 text-xs text-amber-600">*</span>
                  </span>
                  {note.isSystemGenerated && (
                    <span className="px-1.5 py-0.5 text-xs font-mono bg-slate-200 text-slate-600 rounded">
                      系统生成
                    </span>
                  )}
                  <CopyButton text={note.content} size="sm" />
                </div>
                <p className="text-xs text-slate-500 mb-2 font-mono">
                  {note.originalSource} · {formatDateTime(note.createTime)}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
              </div>
            </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
