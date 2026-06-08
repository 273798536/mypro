import React, { useState } from 'react';
import { Camera, Trash2, Edit2, Check, X, Link2, Link2Off } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface ViewpointListProps {
  className?: string;
  onSaveViewpoint?: () => void;
}

const ViewpointList: React.FC<ViewpointListProps> = ({ className, onSaveViewpoint }) => {
  const {
    viewpoints,
    selectedViewpointId,
    selectViewpoint,
    deleteViewpoint,
    records,
    selectedRecordId,
  } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLinkedRecordName = (recordId?: string) => {
    if (!recordId) return null;
    const r = records.find((x) => x.id === recordId);
    return r ? r.name : null;
  };

  const startEdit = (vp: any) => {
    setEditingId(vp.id);
    setEditingName(vp.name);
  };

  const saveEdit = (vp: any) => {
    if (editingName.trim()) {
      const idx = viewpoints.findIndex((v) => v.id === vp.id);
      if (idx >= 0) {
        const updated = { ...viewpoints[idx], name: editingName.trim() };
        const newList = [...viewpoints];
        newList[idx] = updated;
        (useAppStore.getState() as any).viewpoints = newList;
        useAppStore.setState({ viewpoints: newList });
      }
    }
    setEditingId(null);
  };

  const linkedViewpoints = viewpoints.filter((v) => v.recordId === selectedRecordId);
  const otherViewpoints = viewpoints.filter((v) => v.recordId !== selectedRecordId);

  return (
    <div className={cn('absolute top-4 right-4 w-72', className)}>
      <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden shadow-xl">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">保存的视角</span>
            {viewpoints.length > 0 && (
              <span className="text-xs text-slate-400">({viewpoints.length})</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveViewpoint?.();
            }}
            className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <Camera className="w-3 h-3" />
            保存当前
          </button>
        </div>

        {isExpanded && (
          <div className="max-h-72 overflow-y-auto border-t border-slate-700">
            {viewpoints.length === 0 ? (
              <div className="p-6 text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-slate-500">暂无保存的视角</p>
                <p className="text-xs text-slate-600 mt-1">调整好视图后点击"保存当前"</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {linkedViewpoints.length > 0 && selectedRecordId && (
                  <div className="px-3 py-2 bg-blue-500/5">
                    <p className="text-xs text-blue-400 font-medium flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      当前记录视角
                    </p>
                  </div>
                )}
                {linkedViewpoints.map((vp) => (
                  <ViewpointItem
                    key={vp.id}
                    viewpoint={vp}
                    isSelected={selectedViewpointId === vp.id}
                    isEditing={editingId === vp.id}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    linkedRecordName={getLinkedRecordName(vp.recordId)}
                    onSelect={() => selectViewpoint(vp.id)}
                    onDelete={() => deleteViewpoint(vp.id)}
                    onStartEdit={() => startEdit(vp)}
                    onSaveEdit={() => saveEdit(vp)}
                    onCancelEdit={() => setEditingId(null)}
                  />
                ))}

                {otherViewpoints.length > 0 && linkedViewpoints.length > 0 && (
                  <div className="px-3 py-2 bg-slate-800/50">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Link2Off className="w-3 h-3" />
                      其他记录视角
                    </p>
                  </div>
                )}
                {otherViewpoints.map((vp) => (
                  <ViewpointItem
                    key={vp.id}
                    viewpoint={vp}
                    isSelected={selectedViewpointId === vp.id}
                    isEditing={editingId === vp.id}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    linkedRecordName={getLinkedRecordName(vp.recordId)}
                    onSelect={() => selectViewpoint(vp.id)}
                    onDelete={() => deleteViewpoint(vp.id)}
                    onStartEdit={() => startEdit(vp)}
                    onSaveEdit={() => saveEdit(vp)}
                    onCancelEdit={() => setEditingId(null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ViewpointItemProps {
  viewpoint: any;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  setEditingName: (v: string) => void;
  linkedRecordName?: string | null;
  onSelect: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

const ViewpointItem: React.FC<ViewpointItemProps> = ({
  viewpoint,
  isSelected,
  isEditing,
  editingName,
  setEditingName,
  linkedRecordName,
  onSelect,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) => {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'px-3 py-2.5 flex items-center justify-between gap-2 group',
        isSelected && 'bg-blue-500/15'
      )}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="flex-1 bg-slate-700 text-white text-sm px-2 py-1 rounded border border-blue-500/50 outline-none"
            autoFocus
          />
          <button
            onClick={onSaveEdit}
            className="p-1 text-green-400 hover:bg-green-500/20 rounded"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCancelEdit}
            className="p-1 text-slate-400 hover:bg-slate-700 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button onClick={onSelect} className="flex-1 text-left min-w-0">
            <div className="text-sm text-white truncate flex items-center gap-1.5">
              {viewpoint.name}
              {viewpoint.sliceId && (
                <span className="text-[10px] text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded">切片</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-500">{formatDate(viewpoint.created)}</span>
              {linkedRecordName && (
                <span
                  className="text-[10px] text-slate-500 truncate max-w-[100px]"
                  title={linkedRecordName}
                >
                  · {linkedRecordName}
                </span>
              )}
            </div>
          </button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onStartEdit}
              className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
              title="重命名"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`确定删除视角「${viewpoint.name}」吗？`)) {
                  onDelete();
                }
              }}
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ViewpointList;
