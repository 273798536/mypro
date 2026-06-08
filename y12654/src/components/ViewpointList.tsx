import { useState } from 'react';
import { Camera, Pencil, Trash2, Check, X } from 'lucide-react';
import type { SavedViewpoint } from '@/types';

interface Props {
  viewpoints: SavedViewpoint[];
  onSelect: (vp: SavedViewpoint) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSaveNew: (name: string) => void;
}

export default function ViewpointList({ viewpoints, onSelect, onRename, onDelete, onSaveNew }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const startEdit = (vp: SavedViewpoint) => {
    setEditingId(vp.id);
    setEditingName(vp.name);
  };

  const confirmEdit = () => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const startAdd = () => {
    setAddingNew(true);
    setNewName(`视角 ${viewpoints.length + 1}`);
  };

  const confirmAdd = () => {
    if (newName.trim()) {
      onSaveNew(newName.trim());
    }
    setAddingNew(false);
    setNewName('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="label-text">已保存视角</span>
        <button
          onClick={startAdd}
          className="btn-ghost text-xs flex items-center gap-1 py-1"
          disabled={addingNew}
        >
          <Camera size={14} />
          保存当前
        </button>
      </div>

      {addingNew && (
        <div className="flex items-center gap-1.5 p-2 bg-surface-800/40 border border-primary-500/50 rounded-sm">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input-field text-xs py-1 px-2 flex-1 min-w-0"
            placeholder="视角名称"
            autoFocus
          />
          <button onClick={confirmAdd} className="p-1 text-success-400 hover:text-success-300">
            <Check size={14} />
          </button>
          <button onClick={() => setAddingNew(false)} className="p-1 text-surface-400 hover:text-surface-200">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
        {viewpoints.length === 0 && !addingNew && (
          <div className="text-xs text-surface-400 py-4 text-center">
            暂无保存的视角
          </div>
        )}

        {viewpoints.map((vp) => (
          <div
            key={vp.id}
            className="flex items-center gap-1.5 p-2 bg-surface-800/40 border border-surface-600 rounded-sm hover:border-surface-500 transition-colors"
          >
            {editingId === vp.id ? (
              <>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="input-field text-xs py-1 px-2 flex-1 min-w-0"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                />
                <button onClick={confirmEdit} className="p-1 text-success-400 hover:text-success-300">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 text-surface-400 hover:text-surface-200">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onSelect(vp)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-xs text-surface-100 font-medium truncate">
                    <Camera size={12} className="inline mr-1 -mt-0.5" />
                    {vp.name}
                  </div>
                  <div className="text-[10px] text-surface-400 font-mono">
                    {vp.createdAt}
                  </div>
                </button>
                <button
                  onClick={() => startEdit(vp)}
                  className="p-1 text-surface-400 hover:text-primary-300"
                  title="重命名"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(vp.id)}
                  className="p-1 text-surface-400 hover:text-danger-400"
                  title="删除"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
