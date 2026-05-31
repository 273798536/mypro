import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Lightbulb, HelpCircle, X, Plus, Edit2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AnnotationType } from '../types';

const AnnotationPanel: React.FC = () => {
  const { annotations, currentMeasureId, addAnnotation, updateAnnotation, getMeasureById } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<AnnotationType>('suggestion');

  const currentMeasure = currentMeasureId ? getMeasureById(currentMeasureId) : null;
  const measureAnnotations = currentMeasureId 
    ? annotations.filter((a) => a.measureId === currentMeasureId)
    : annotations;

  const getTypeIcon = (type: AnnotationType) => {
    switch (type) {
      case 'correction':
        return <X size={14} className="text-jazz-burgundy-400" />;
      case 'suggestion':
        return <Lightbulb size={14} className="text-jazz-gold-400" />;
      case 'praise':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'question':
        return <HelpCircle size={14} className="text-jazz-blue-400" />;
    }
  };

  const getTypeLabel = (type: AnnotationType) => {
    switch (type) {
      case 'correction':
        return '纠正';
      case 'suggestion':
        return '建议';
      case 'praise':
        return '表扬';
      case 'question':
        return '疑问';
    }
  };

  const getTypeBgColor = (type: AnnotationType) => {
    switch (type) {
      case 'correction':
        return 'bg-jazz-burgundy-500/20 border-jazz-burgundy-500/30';
      case 'suggestion':
        return 'bg-jazz-gold-500/20 border-jazz-gold-500/30';
      case 'praise':
        return 'bg-green-500/20 border-green-500/30';
      case 'question':
        return 'bg-jazz-blue-500/20 border-jazz-blue-500/30';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleAdd = () => {
    if (!currentMeasureId || !newContent.trim()) return;
    
    addAnnotation({
      measureId: currentMeasureId,
      startTime: currentMeasure?.startTime || 0,
      endTime: currentMeasure?.endTime || 0,
      type: newType,
      content: newContent,
      author: '张老师',
    });
    
    setNewContent('');
    setIsAdding(false);
  };

  const handleUpdate = (id: string) => {
    if (!newContent.trim()) return;
    updateAnnotation(id, newContent);
    setEditingId(null);
    setNewContent('');
  };

  return (
    <div className="bg-jazz-ink-800 rounded-lg border border-jazz-ink-700 overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-jazz-ink-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-jazz-burgundy-400" />
          <h3 className="font-display text-lg text-jazz-ink-100">老师批注</h3>
        </div>
        {currentMeasureId && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 rounded bg-jazz-burgundy-700 hover:bg-jazz-burgundy-600 text-white transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {currentMeasureId && (
        <div className="px-4 py-2 bg-jazz-ink-700/50 border-b border-jazz-ink-700">
          <span className="text-sm text-jazz-ink-400">
            当前小节: <span className="font-mono text-jazz-gold-400">m{currentMeasure?.measureNumber}</span>
          </span>
        </div>
      )}

      {isAdding && currentMeasureId && (
        <div className="p-4 border-b border-jazz-ink-700 bg-jazz-ink-700/30 animate-slide-in">
          <div className="flex gap-2 mb-3">
            {(['correction', 'suggestion', 'praise', 'question'] as AnnotationType[]).map((type) => (
              <button
                key={type}
                onClick={() => setNewType(type)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
                  ${newType === type ? getTypeBgColor(type) + ' border' : 'bg-jazz-ink-700 hover:bg-jazz-ink-600'}
                `}
              >
                {getTypeIcon(type)}
                <span>{getTypeLabel(type)}</span>
              </button>
            ))}
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="输入批注内容..."
            className="w-full p-3 bg-jazz-ink-900 border border-jazz-ink-600 rounded text-sm text-jazz-ink-100 placeholder-jazz-ink-500 focus:outline-none focus:border-jazz-burgundy-500 resize-none"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-sm bg-jazz-ink-700 hover:bg-jazz-ink-600 rounded transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={!newContent.trim()}
              className="px-3 py-1.5 text-sm bg-jazz-burgundy-700 hover:bg-jazz-burgundy-600 disabled:opacity-50 rounded transition-colors"
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {measureAnnotations.length === 0 ? (
          <div className="text-center py-8 text-jazz-ink-500">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {currentMeasureId ? '暂无批注，点击 + 添加' : '选择一个小节查看批注'}
            </p>
          </div>
        ) : (
          measureAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className={`p-3 rounded border ${getTypeBgColor(annotation.type)} animate-fade-in`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(annotation.type)}
                  <span className="text-xs font-medium text-jazz-ink-300">
                    {getTypeLabel(annotation.type)}
                  </span>
                  <span className="text-xs text-jazz-ink-500 font-mono">
                    m{getMeasureById(annotation.measureId)?.measureNumber}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingId(annotation.id);
                    setNewContent(annotation.content);
                  }}
                  className="p-1 hover:bg-jazz-ink-600 rounded transition-colors"
                >
                  <Edit2 size={12} className="text-jazz-ink-400" />
                </button>
              </div>
              
              {editingId === annotation.id ? (
                <div>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full p-2 bg-jazz-ink-900 border border-jazz-ink-600 rounded text-sm text-jazz-ink-100 focus:outline-none focus:border-jazz-burgundy-500 resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs bg-jazz-ink-700 hover:bg-jazz-ink-600 rounded"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleUpdate(annotation.id)}
                      className="px-2 py-1 text-xs bg-jazz-burgundy-700 hover:bg-jazz-burgundy-600 rounded"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-jazz-ink-200 leading-relaxed">
                  {annotation.content}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-2 text-xs text-jazz-ink-500">
                <span>{annotation.author}</span>
                <span>{formatTime(annotation.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnotationPanel;
