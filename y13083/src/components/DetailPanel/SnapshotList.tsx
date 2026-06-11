import { useState } from 'react';
import { Save, RotateCcw, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function SnapshotList() {
  const { snapshots, saveSnapshot, restoreSnapshot, deleteSnapshot } = useAppStore();
  const [name, setName] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      saveSnapshot(name.trim());
      setName('');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="快照名称"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 bg-slate-800/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-medium rounded px-3 py-2 transition-colors"
          >
            <Save size={13} />
            保存当前视图
          </button>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-16">
          <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
            <Save size={20} className="text-slate-600" />
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            暂无快照，保存当前筛选条件和视角以便快速恢复
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="bg-slate-800/40 border border-slate-700/50 rounded p-3 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-200 truncate">
                    {snap.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{snap.createdAt}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => restoreSnapshot(snap.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded px-2.5 py-1.5 transition-colors"
                >
                  <RotateCcw size={12} />
                  恢复
                </button>
                <button
                  onClick={() => deleteSnapshot(snap.id)}
                  className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded px-2.5 py-1.5 transition-colors border border-red-500/20"
                >
                  <Trash2 size={12} />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
