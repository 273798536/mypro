import React, { useState } from 'react';
import { Annotation, DamageLevel, DAMAGE_LEVEL_LABELS, DAMAGE_LEVEL_COLORS } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { X, Edit2, Trash2, MapPin, Tag, FileText, Calendar } from 'lucide-react';

interface InfoPanelProps {
  annotation: Annotation | null;
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  annotation,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(annotation?.notes || '');
  const [editTreeRowId, setEditTreeRowId] = useState(annotation?.treeRowId || '');
  const [editDamageLevel, setEditDamageLevel] = useState<DamageLevel>(annotation?.damageLevel || 'minor');

  React.useEffect(() => {
    setEditNotes(annotation?.notes || '');
    setEditTreeRowId(annotation?.treeRowId || '');
    setEditDamageLevel(annotation?.damageLevel || 'minor');
    setIsEditing(false);
  }, [annotation]);

  if (!annotation) {
    return (
      <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <MapPin size={24} className="text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm">选择标注查看详情</p>
          <p className="text-slate-500 text-xs mt-1">点击3D场景中的标注框</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!annotation) return;
    onUpdate(annotation.id, {
      notes: editNotes,
      treeRowId: editTreeRowId,
      damageLevel: editDamageLevel,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditNotes(annotation.notes);
    setEditTreeRowId(annotation.treeRowId);
    setEditDamageLevel(annotation.damageLevel);
    setIsEditing(false);
  };

  const damageLevels: DamageLevel[] = ['none', 'minor', 'moderate', 'severe', 'critical'];

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">标注详情</h3>
          <p className="text-xs text-slate-400 mt-0.5">{annotation.treeRowId}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400">损失等级</span>
          </div>
          {isEditing ? (
            <div className="space-y-1">
              {damageLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setEditDamageLevel(level)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                    editDamageLevel === level
                      ? 'ring-1 ring-offset-1 ring-offset-slate-900'
                      : 'hover:bg-slate-800'
                  }`}
                  style={{
                    backgroundColor: editDamageLevel === level ? `${DAMAGE_LEVEL_COLORS[level]}20` : 'transparent',
                    borderColor: DAMAGE_LEVEL_COLORS[level],
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: DAMAGE_LEVEL_COLORS[level] }}
                  />
                  <span className="text-slate-300">{DAMAGE_LEVEL_LABELS[level]}</span>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: `${DAMAGE_LEVEL_COLORS[annotation.damageLevel]}20`,
                borderLeft: `3px solid ${DAMAGE_LEVEL_COLORS[annotation.damageLevel]}`,
              }}
            >
              <span className="text-white">{DAMAGE_LEVEL_LABELS[annotation.damageLevel]}</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400">树行编号</span>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editTreeRowId}
              onChange={(e) => setEditTreeRowId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="输入树行编号"
            />
          ) : (
            <div className="px-3 py-2 bg-slate-800 rounded text-sm text-white">
              {annotation.treeRowId || '-'}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400">查勘备注</span>
          </div>
          {isEditing ? (
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="输入查勘备注信息..."
            />
          ) : (
            <div className="px-3 py-2 bg-slate-800 rounded text-sm text-slate-300 min-h-[60px]">
              {annotation.notes || '暂无备注'}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400">时间信息</span>
          </div>
          <div className="px-3 py-2 bg-slate-800 rounded text-xs text-slate-400 space-y-1">
            <p>创建时间: <span className="text-slate-300">{annotation.createdAt.toLocaleString()}</span></p>
            <p>更新时间: <span className="text-slate-300">{annotation.updatedAt.toLocaleString()}</span></p>
            <p>创建人: <span className="text-slate-300">{annotation.createdBy}</span></p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-400">坐标范围</span>
          </div>
          <div className="px-3 py-2 bg-slate-800 rounded text-xs text-slate-400 font-mono">
            <p>Min: ({annotation.box.min.x.toFixed(2)}, {annotation.box.min.y.toFixed(2)}, {annotation.box.min.z.toFixed(2)})</p>
            <p>Max: ({annotation.box.max.x.toFixed(2)}, {annotation.box.max.y.toFixed(2)}, {annotation.box.max.z.toFixed(2)})</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 flex gap-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              保存
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
            >
              <Edit2 size={14} />
              <span>编辑</span>
            </button>
            <button
              onClick={() => onDelete(annotation.id)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded text-sm transition-colors"
            >
              <Trash2 size={14} />
              <span>删除</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InfoPanel;
