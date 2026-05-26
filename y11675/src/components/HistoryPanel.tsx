import { Clock, Trash2, Camera, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { HistoryEntry, Snapshot } from '@/types';

export function HistoryPanel() {
  const { history, snapshots, loadSnapshot, deleteSnapshot } = useStore();

  return (
    <div className="h-40 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700/50 flex">
      <div className="w-1/2 border-r border-slate-700/50 flex flex-col">
        <div className="px-4 py-2 border-b border-slate-700/50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-white">操作历史</h3>
          <span className="text-xs text-slate-500 ml-auto">
            {history.length} 条记录
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              暂无操作记录
            </div>
          ) : (
            history.map((entry, index) => (
              <HistoryItem key={entry.id} entry={entry} isActive={index === history.length - 1} />
            ))
          )}
        </div>
      </div>

      <div className="w-1/2 flex flex-col">
        <div className="px-4 py-2 border-b border-slate-700/50 flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-white">快照记录</h3>
          <span className="text-xs text-slate-500 ml-auto">
            {snapshots.length} 条记录
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {snapshots.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              暂无快照记录
            </div>
          ) : (
            snapshots.map(snapshot => (
              <SnapshotItem
                key={snapshot.id}
                snapshot={snapshot}
                onLoad={() => loadSnapshot(snapshot.id)}
                onDelete={() => deleteSnapshot(snapshot.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface HistoryItemProps {
  entry: HistoryEntry;
  isActive: boolean;
}

function HistoryItem({ entry, isActive }: HistoryItemProps) {
  const actionIcons = {
    add: '+',
    remove: '-',
    update: '~',
    reset: '↺',
    preset: '⚡'
  };

  const actionColors = {
    add: 'text-green-400',
    remove: 'text-red-400',
    update: 'text-yellow-400',
    reset: 'text-blue-400',
    preset: 'text-cyan-400'
  };

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
        isActive ? 'bg-slate-700/50' : 'hover:bg-slate-800/50'
      }`}
    >
      <span className={`font-mono ${actionColors[entry.action as keyof typeof actionColors] || 'text-slate-400'}`}>
        {actionIcons[entry.action as keyof typeof actionIcons] || '•'}
      </span>
      <span className="text-slate-300 flex-1 truncate">{entry.description}</span>
      <span className="text-slate-500">
        {new Date(entry.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

interface SnapshotItemProps {
  snapshot: Snapshot;
  onLoad: () => void;
  onDelete: () => void;
}

function SnapshotItem({ snapshot, onLoad, onDelete }: SnapshotItemProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-slate-800/50 hover:bg-slate-700/50 transition-colors group">
      <Camera className="w-3 h-3 text-cyan-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-slate-300 truncate">{snapshot.name}</div>
        <div className="text-slate-500 text-[10px]">
          {new Date(snapshot.timestamp).toLocaleString()}
        </div>
      </div>
      <button
        onClick={onLoad}
        className="p-1 rounded hover:bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
        title="加载快照"
      >
        <ChevronRight className="w-3 h-3 text-cyan-400" />
      </button>
      <button
        onClick={onDelete}
        className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
        title="删除快照"
      >
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}
