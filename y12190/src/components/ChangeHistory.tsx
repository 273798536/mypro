import React, { useState } from 'react';
import { History, User, Bot, ChevronDown, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ChangeSource } from '../types';

const ChangeHistory: React.FC = () => {
  const { changeRecords, getMeasureById, setCurrentMeasure } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSourceIcon = (source: ChangeSource) => {
    switch (source) {
      case 'manual':
        return <User size={14} className="text-jazz-burgundy-400" />;
      case 'auto-correct':
        return <Bot size={14} className="text-jazz-blue-400" />;
      case 'import':
        return <ArrowLeftRight size={14} className="text-jazz-gold-400" />;
    }
  };

  const getSourceLabel = (source: ChangeSource) => {
    switch (source) {
      case 'manual':
        return '手动修改';
      case 'auto-correct':
        return '自动修正';
      case 'import':
        return '导入变更';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'chord':
        return '和弦';
      case 'note':
        return '音符';
      case 'annotation':
        return '批注';
      case 'measure':
        return '小节';
      default:
        return entityType;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const findMeasureNumber = (entityId: string) => {
    const measure = getMeasureById(entityId);
    if (measure) return measure.measureNumber;
    
    const measures = useStore.getState().measures;
    const measureWithNote = measures.find((m) =>
      m.notes.some((n) => n.id === entityId)
    );
    if (measureWithNote) return measureWithNote.measureNumber;

    const annotations = useStore.getState().annotations;
    const annotation = annotations.find((a) => a.id === entityId);
    if (annotation) {
      const annMeasure = getMeasureById(annotation.measureId);
      return annMeasure?.measureNumber;
    }
    
    return null;
  };

  const handleJumpToMeasure = (entityId: string) => {
    const measure = getMeasureById(entityId);
    if (measure) {
      setCurrentMeasure(measure.id);
      return;
    }
    
    const measures = useStore.getState().measures;
    const measureWithNote = measures.find((m) =>
      m.notes.some((n) => n.id === entityId)
    );
    if (measureWithNote) {
      setCurrentMeasure(measureWithNote.id);
      return;
    }

    const annotations = useStore.getState().annotations;
    const annotation = annotations.find((a) => a.id === entityId);
    if (annotation) {
      setCurrentMeasure(annotation.measureId);
    }
  };

  return (
    <div className="bg-jazz-ink-800 rounded-lg border border-jazz-ink-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-jazz-ink-700 flex items-center gap-2">
        <History size={18} className="text-jazz-burgundy-400" />
        <h3 className="font-display text-lg text-jazz-ink-100">变更历史</h3>
        <span className="ml-auto text-xs text-jazz-ink-500">
          共 {changeRecords.length} 条记录
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {changeRecords.map((record) => {
          const measureNum = findMeasureNumber(record.entityId);
          const isExpanded = expandedId === record.id;

          return (
            <div
              key={record.id}
              className="border-b border-jazz-ink-700/50 last:border-b-0"
            >
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-jazz-ink-700/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
              >
                <button className="text-jazz-ink-400">
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>

                <div className="flex-shrink-0">
                  {getSourceIcon(record.source)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-jazz-ink-200">
                      {getEntityTypeLabel(record.entityType)}
                      <span className="text-jazz-ink-500 mx-1">·</span>
                      {record.fieldName}
                    </span>
                    {measureNum && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToMeasure(record.entityId);
                        }}
                        className="text-xs font-mono px-1.5 py-0.5 bg-jazz-burgundy-700/30 text-jazz-burgundy-300 rounded hover:bg-jazz-burgundy-700/50 transition-colors"
                      >
                        m{measureNum}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-jazz-ink-500">
                      {record.operator}
                    </span>
                    <span className="text-jazz-ink-600">·</span>
                    <span className="text-xs text-jazz-ink-500">
                      {formatTime(record.timestamp)}
                    </span>
                    <span className="text-jazz-ink-600">·</span>
                    <span className="text-xs text-jazz-ink-400">
                      {getSourceLabel(record.source)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  {record.oldValue && (
                    <span className="px-2 py-1 bg-jazz-burgundy-900/30 text-jazz-burgundy-400 rounded line-through max-w-[100px] truncate">
                      {record.oldValue}
                    </span>
                  )}
                  <ArrowLeftRight size={12} className="text-jazz-ink-500" />
                  <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded max-w-[100px] truncate">
                    {record.newValue}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 animate-slide-in">
                  <div className="bg-jazz-ink-900/50 rounded-lg p-4 border border-jazz-ink-600">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-jazz-ink-500 mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-jazz-burgundy-500"></span>
                          修改前
                        </div>
                        <div className="p-3 bg-jazz-burgundy-900/20 rounded border border-jazz-burgundy-500/20 text-jazz-ink-300 text-sm font-mono break-all">
                          {record.oldValue || '(空)'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-jazz-ink-500 mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-green-500"></span>
                          修改后
                        </div>
                        <div className="p-3 bg-green-900/20 rounded border border-green-500/20 text-green-400 text-sm font-mono break-all">
                          {record.newValue}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-jazz-ink-600 grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-jazz-ink-500">操作类型</span>
                        <p className="text-jazz-ink-300 mt-1">{getSourceLabel(record.source)}</p>
                      </div>
                      <div>
                        <span className="text-jazz-ink-500">操作人</span>
                        <p className="text-jazz-ink-300 mt-1">{record.operator}</p>
                      </div>
                      <div>
                        <span className="text-jazz-ink-500">实体ID</span>
                        <p className="text-jazz-ink-400 mt-1 font-mono truncate">{record.entityId}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChangeHistory;
