import { useState, useCallback, useRef, useEffect } from 'react';
import { Route, Plus, Trash2, Edit3, Check, X, Eye, EyeOff } from 'lucide-react';
import { usePathStore } from '@/store/pathStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { useRevisionStore } from '@/store/revisionStore';
import { PATH_COLORS } from '@/shared/constants';
import type { PathNode, Point2D } from '@/types';
import { cn } from '@/lib/utils';

export function PathEditor() {
  const { paths, activeVectorFieldId, activePathId, setActivePath, addPath, updatePath, deletePath, addNode, updateNode, deleteNode } = usePathStore();
  const { selectedPathIds, togglePathSelection, selectAllPaths, clearSelection } = useIntegrationStore();
  const { addEntry } = useRevisionStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [hiddenPaths, setHiddenPaths] = useState<Set<string>>(new Set());

  const activePaths = paths.filter((p) => p.vectorFieldId === activeVectorFieldId);

  const handleAddPath = useCallback(() => {
    if (!activeVectorFieldId) return;

    const nodes: PathNode[] = [
      { id: `node-${Date.now()}-1`, x: -2, y: 0, order: 0 },
      { id: `node-${Date.now()}-2`, x: 0, y: 2, order: 1 },
      { id: `node-${Date.now()}-3`, x: 2, y: 0, order: 2 },
    ];

    const newPath = addPath({
      vectorFieldId: activeVectorFieldId,
      name: `路径 ${activePaths.length + 1}`,
      color: PATH_COLORS[activePaths.length % PATH_COLORS.length],
      studentRemark: '',
      source: '手动创建',
      nodes,
    });

    setActivePath(newPath.id);

    addEntry({
      targetType: 'path',
      targetId: newPath.id,
      action: 'create',
      previousValue: null,
      newValue: newPath,
      source: '手动创建',
      correctionNote: '创建新路径',
    });
  }, [activeVectorFieldId, activePaths.length, addPath, setActivePath, addEntry]);

  const handleDeletePath = useCallback(
    (pathId: string) => {
      const path = paths.find((p) => p.id === pathId);
      if (!path) return;

      deletePath(pathId);

      addEntry({
        targetType: 'path',
        targetId: pathId,
        action: 'delete',
        previousValue: path,
        newValue: null,
        source: '手动删除',
        correctionNote: '删除路径',
      });
    },
    [paths, deletePath, addEntry]
  );

  const handleStartEdit = useCallback(
    (path: typeof paths[0]) => {
      setEditingId(path.id);
      setEditName(path.name);
      setEditRemark(path.studentRemark);
    },
    []
  );

  const handleSaveEdit = useCallback(
    (pathId: string) => {
      const path = paths.find((p) => p.id === pathId);
      if (!path) return;

      const prevPath = { ...path };
      updatePath(pathId, { name: editName, studentRemark: editRemark });

      addEntry({
        targetType: 'path',
        targetId: pathId,
        action: 'update',
        previousValue: { name: prevPath.name, studentRemark: prevPath.studentRemark },
        newValue: { name: editName, studentRemark: editRemark },
        source: '手动编辑',
        correctionNote: '更新路径信息',
      });

      setEditingId(null);
    },
    [paths, updatePath, editName, editRemark, addEntry]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName('');
    setEditRemark('');
  }, []);

  const togglePathVisibility = useCallback((pathId: string) => {
    setHiddenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathId)) {
        next.delete(pathId);
      } else {
        next.add(pathId);
      }
      return next;
    });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">路径列表</span>
          <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full border">
            {activePaths.length} 条
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => selectAllPaths(activePaths.map((p) => p.id))}
            className="p-1.5 text-xs text-slate-600 hover:bg-white rounded transition-colors"
            title="全选"
          >
            全选
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 text-xs text-slate-600 hover:bg-white rounded transition-colors"
            title="取消全选"
          >
            取消
          </button>
          <button
            onClick={handleAddPath}
            className="p-1.5 text-blue-600 hover:bg-white rounded transition-colors"
            title="添加路径"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {activePaths.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            暂无路径，点击 + 添加
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activePaths.map((path) => {
              const isSelected = selectedPathIds.includes(path.id);
              const isActive = activePathId === path.id;
              const isEditing = editingId === path.id;
              const isHidden = hiddenPaths.has(path.id);

              return (
                <div
                  key={path.id}
                  className={cn(
                    'p-3 transition-colors',
                    isActive && !isEditing ? 'bg-blue-50' : 'hover:bg-slate-50'
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        placeholder="路径名称"
                      />
                      <input
                        type="text"
                        value={editRemark}
                        onChange={(e) => setEditRemark(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        placeholder="学生备注"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSaveEdit(path.id)}
                          className="flex-1 p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-xs"
                        >
                          <Check className="w-3 h-3" /> 保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 p-1.5 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 text-xs"
                        >
                          <X className="w-3 h-3" /> 取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePathSelection(path.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: path.color }}
                        />
                        <button
                          onClick={() => setActivePath(path.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="font-medium text-sm text-slate-800 truncate">
                            {path.name}
                          </div>
                          {path.studentRemark && (
                            <div className="text-xs text-slate-500 truncate">
                              {path.studentRemark}
                            </div>
                          )}
                        </button>
                        <button
                          onClick={() => togglePathVisibility(path.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          title={isHidden ? '显示' : '隐藏'}
                        >
                          {isHidden ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(path)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePath(path.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {path.source && (
                        <div className="mt-1 ml-6 text-xs text-slate-400">
                          来源: {path.source}
                        </div>
                      )}
                      <div className="mt-1 ml-6 text-xs text-slate-400">
                        {path.nodes.length} 个节点
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
