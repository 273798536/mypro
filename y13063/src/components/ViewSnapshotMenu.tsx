import { useState } from 'react';
import { Camera, Plus, Trash2, Bookmark } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  onClose: () => void;
}

export default function ViewSnapshotMenu({ onClose }: Props) {
  const snapshots = useAppStore((s) => s.viewSnapshots);
  const saveViewSnapshot = useAppStore((s) => s.saveViewSnapshot);
  const restoreViewSnapshot = useAppStore((s) => s.restoreViewSnapshot);
  const deleteViewSnapshot = useAppStore((s) => s.deleteViewSnapshot);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function handleSave() {
    if (!name.trim()) {
      saveViewSnapshot(`视图 ${snapshots.length + 1}`);
    } else {
      saveViewSnapshot(name.trim());
    }
    setName('');
    setSaving(false);
  }

  return (
    <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-brand-100 rounded-sm shadow-lg z-20 overflow-hidden fade-in-up">
      <div className="p-2 border-b border-brand-100 bg-brand-50/50">
        {saving ? (
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="输入视图名称..."
              className="flex-1 px-2 py-1 text-sm border border-brand-200 rounded-sm focus:outline-none focus:border-brand-500"
            />
            <button onClick={handleSave} className="btn-primary">
              保存
            </button>
            <button
              onClick={() => {
                setSaving(false);
                setName('');
              }}
              className="btn-ghost"
            >
              取消
            </button>
          </div>
        ) : (
          <button onClick={() => setSaving(true)} className="btn-secondary w-full justify-center">
            <Plus className="w-4 h-4" />
            保存当前视图
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto scroll-thin">
        {snapshots.length === 0 ? (
          <div className="py-8 text-center text-brand-400 text-xs">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
            暂无保存的视图快照
          </div>
        ) : (
          <ul className="divide-y divide-brand-50">
            {snapshots.map((snap) => (
              <li
                key={snap.id}
                className="group px-3 py-2 hover:bg-brand-50 flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4 text-brand-400 shrink-0" />
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    restoreViewSnapshot(snap.id);
                    onClose();
                  }}
                >
                  <div className="text-sm text-brand-800 font-medium">{snap.name}</div>
                  <div className="text-[10px] text-brand-400">
                    {new Date(snap.createdAt).toLocaleString('zh-CN')}
                    {snap.filters.flags.length > 0 && (
                      <span className="ml-2 text-accent-amber">
                        筛选 {snap.filters.flags.length} 项
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => deleteViewSnapshot(snap.id)}
                  className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-accent-rust transition-opacity p-1"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
