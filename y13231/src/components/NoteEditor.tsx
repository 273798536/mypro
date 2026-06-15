import { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Edit3, Save, X, MessageSquare, Clock, User } from 'lucide-react';
import type { NoteChange } from '@/types';

interface NoteEditorProps {
  currentNote: string;
  noteChanges: NoteChange[];
  onSave: (newNote: string) => void;
}

export function NoteEditor({ currentNote, noteChanges, onSave }: NoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentNote);

  const handleSave = () => {
    if (editValue !== currentNote) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(currentNote);
    setIsEditing(false);
  };

  const sortedChanges = [...noteChanges].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          备注信息
        </h3>
        {!isEditing && (
          <button
            onClick={() => {
              setEditValue(currentNote);
              setIsEditing(true);
            }}
            className="btn-secondary text-sm py-1 px-3 flex items-center gap-1"
          >
            <Edit3 className="w-4 h-4" />
            修改备注
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="card p-4 animate-slide-up">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            placeholder="输入备注信息，所有修改将自动记录历史..."
            className="input-field resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-3">
            <button onClick={handleCancel} className="btn-secondary text-sm py-1">
              取消
            </button>
            <button onClick={handleSave} className="btn-primary text-sm py-1 flex items-center gap-1">
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <p className={`whitespace-pre-wrap ${currentNote ? 'text-primary-800' : 'text-primary-400 italic'}`}>
            {currentNote || '暂无备注，点击"修改备注"添加'}
          </p>
        </div>
      )}

      {sortedChanges.length > 0 && (
        <div className="mt-6">
          <h4 className="font-display font-semibold text-primary-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            备注历史记录
          </h4>
          <div className="space-y-3">
            {sortedChanges.map((change, index) => (
              <div
                key={change.id}
                className="card p-4 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-2 mb-2 text-sm text-primary-500">
                  <User className="w-4 h-4" />
                  <span>{change.operator}</span>
                  <span>·</span>
                  <span>{format(new Date(change.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
                </div>
                
                {change.oldNote && (
                  <div className="mb-2">
                    <span className="text-xs text-red-500 font-medium">修改前：</span>
                    <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded mt-1 line-through">
                      {change.oldNote}
                    </p>
                  </div>
                )}
                
                <div>
                  <span className="text-xs text-green-600 font-medium">修改后：</span>
                  <p className="text-sm text-green-800 bg-green-50 px-3 py-2 rounded mt-1">
                    {change.newNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
