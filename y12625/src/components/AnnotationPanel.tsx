import React, { useState } from 'react';
import { AlertCircle, CheckCircle, FileText, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { validateAllAnnotations } from '@/utils/annotationDetector';
import { getLevelById } from '@/data/levels';
import { Annotation, IssueType } from '@/types';

const ISSUE_LABELS: Record<IssueType, string> = {
  empty_value: '空值',
  duplicate: '重复',
  mixed_note: '备注混写',
  out_of_boundary: '超出边界'
};

const ISSUE_COLORS: Record<IssueType, string> = {
  empty_value: '#F59E0B',
  duplicate: '#EC4899',
  mixed_note: '#8B5CF6',
  out_of_boundary: '#EF4444'
};

export const AnnotationPanel: React.FC = () => {
  const {
    annotations,
    currentLevelId,
    boundaryFailed,
    updateAnnotation,
    deleteAnnotation
  } = useExperimentStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editSource, setEditSource] = useState('');

  const currentLevel = currentLevelId ? getLevelById(currentLevelId) : null;
  const boundary = currentLevel?.boundary || { x: 5, y: 5 };

  const { valid, pending, allIssues } = validateAllAnnotations(annotations, boundary);

  const handleStartEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditNote(annotation.note);
    setEditSource(annotation.sourceMaterial);
  };

  const handleSaveEdit = (id: string) => {
    updateAnnotation(id, {
      note: editNote,
      sourceMaterial: editSource
    });
    setEditingId(null);
    setEditNote('');
    setEditSource('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNote('');
    setEditSource('');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const validCount = valid.length;
  const pendingCount = pending.length + (boundaryFailed ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col h-full max-h-[600px]">
      <h3 className="text-lg font-bold text-[#0F3B5F] mb-4" style={{ fontFamily: '"Playfair Display", serif' }}>
        标注管理
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#2DD4BF] bg-opacity-10 rounded-lg p-3 border border-[#2DD4BF] border-opacity-30">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={18} className="text-[#2DD4BF]" />
            <span className="text-sm font-semibold text-[#2DD4BF]">可直接使用</span>
          </div>
          <div className="text-2xl font-bold text-[#2DD4BF]" style={{ fontFamily: '"Fira Code", monospace' }}>
            {validCount}
          </div>
        </div>
        <div className="bg-[#F59E0B] bg-opacity-10 rounded-lg p-3 border border-[#F59E0B] border-opacity-30">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={18} className="text-[#F59E0B]" />
            <span className="text-sm font-semibold text-[#F59E0B]">待复核</span>
          </div>
          <div className="text-2xl font-bold text-[#F59E0B]" style={{ fontFamily: '"Fira Code", monospace' }}>
            {pendingCount}
          </div>
        </div>
      </div>

      {boundaryFailed && (
        <div className="mb-4 p-3 bg-[#EC4899] bg-opacity-10 rounded-lg border border-[#EC4899] border-opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-[#EC4899]" />
            <span className="text-sm font-medium text-[#EC4899]">边界失败</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            存在超出边界的绘制操作，请修正后重新提交
          </p>
        </div>
      )}

      {allIssues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <AlertCircle size={16} />
            异常检测
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {allIssues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 bg-slate-50 rounded text-xs"
              >
                <div
                  className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: ISSUE_COLORS[issue.type] }}
                />
                <div>
                  <span
                    className="font-medium"
                    style={{ color: ISSUE_COLORS[issue.type] }}
                  >
                    [{ISSUE_LABELS[issue.type]}]
                  </span>
                  <span className="text-slate-600 ml-1">{issue.description}</span>
                  <div className="text-slate-400 mt-0.5 flex items-center gap-1">
                    <FileText size={10} />
                    <span>{issue.sourceReference}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h4 className="text-sm font-semibold text-slate-700 mb-2">标注列表</h4>
      <div className="flex-1 overflow-y-auto space-y-2">
        {annotations.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无标注</p>
            <p className="text-xs">在画布上绘制以创建标注</p>
          </div>
        ) : (
          annotations.map((annotation) => {
            const issues = allIssues.filter(i =>
              i.sourceReference.includes(annotation.id)
            );
            const isPending = issues.length > 0;
            const isExpanded = expandedId === annotation.id;
            const isEditing = editingId === annotation.id;

            return (
              <div
                key={annotation.id}
                className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                  isPending
                    ? 'border-[#F59E0B] border-opacity-50'
                    : 'border-[#2DD4BF] border-opacity-50'
                }`}
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(annotation.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: annotation.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {annotation.type === 'curve' ? '曲线' : '区域'}
                        <span className="text-xs text-slate-400 ml-2">
                          {annotation.points.length} 个点
                        </span>
                      </div>
                      {annotation.note && (
                        <div className="text-xs text-slate-500 truncate max-w-40">
                          {annotation.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <span className="text-xs px-2 py-0.5 bg-[#F59E0B] bg-opacity-10 text-[#F59E0B] rounded">
                        待复核
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-[#2DD4BF] bg-opacity-10 text-[#2DD4BF] rounded">
                        可使用
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-100 pt-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            备注
                          </label>
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-[#0F3B5F]"
                            placeholder="输入备注说明"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            来源材料
                          </label>
                          <input
                            type="text"
                            value={editSource}
                            onChange={(e) => setEditSource(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-[#0F3B5F]"
                            placeholder="如：教材第三章第2节"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleSaveEdit(annotation.id)}
                            className="px-3 py-1 text-xs text-white bg-[#0F3B5F] rounded hover:bg-opacity-90"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs">
                          <span className="text-slate-500">备注：</span>
                          <span className="text-slate-700 ml-1">
                            {annotation.note || '-'}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">来源：</span>
                          <span className="text-slate-700 ml-1">
                            {annotation.sourceMaterial || '-'}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">坐标：</span>
                          <span className="text-slate-700 ml-1 font-mono">
                            {annotation.points.map(p => `(${p.x},${p.y})`).join(', ')}
                          </span>
                        </div>
                        {issues.length > 0 && (
                          <div className="mt-2 p-2 bg-[#F59E0B] bg-opacity-10 rounded">
                            <div className="text-xs font-medium text-[#F59E0B] mb-1">
                              问题：
                            </div>
                            {issues.map((issue, idx) => (
                              <div key={idx} className="text-xs text-slate-600">
                                • {issue.description}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(annotation);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-[#0F3B5F] border border-[#0F3B5F] rounded hover:bg-[#0F3B5F] hover:text-white transition-colors"
                          >
                            <Edit2 size={12} />
                            编辑
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotation(annotation.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-[#EC4899] border border-[#EC4899] rounded hover:bg-[#EC4899] hover:text-white transition-colors"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
