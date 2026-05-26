
import { useState } from 'react';
import { FileText, Play, Trash2, Eye, History, Tag, Clock } from 'lucide-react';
import type { ExperimentRecord } from '../../types';
import { useExperimentStore } from '../../store/useExperimentStore';

export function RecordPanel() {
  const { records, selectedRecordId, loadRecord, deleteRecord, selectRecord } =
    useExperimentStore();
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'manual':
        return '手动输入';
      case 'import':
        return '导入数据';
      case 'lecture':
        return '讲义截图';
      default:
        return source;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'manual':
        return 'bg-cyan-600';
      case 'import':
        return 'bg-purple-600';
      case 'lecture':
        return 'bg-amber-600';
      default:
        return 'bg-slate-600';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedRecordId(expandedRecordId === id ? null : id);
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-slate-700 pb-2">
        <FileText size={18} />
        <span>实验记录</span>
        <span className="ml-auto text-xs text-slate-400">{records.length} 条</span>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center">
          暂无记录，点击"保存记录"添加
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {records.map((record) => (
            <div
              key={record.id}
              className={`rounded-lg overflow-hidden transition-all ${
                selectedRecordId === record.id
                  ? 'ring-2 ring-cyan-500 bg-slate-700/50'
                  : 'bg-slate-700/30 hover:bg-slate-700/50'
              }`}
            >
              <div className="p-3 cursor-pointer" onClick={() => toggleExpand(record.id)}>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${getSourceColor(record.source)}`}>
                    {getSourceLabel(record.source)}
                  </span>
                  <span className="text-sm text-white font-medium flex-1">
                    {record.airfoil.name}
                  </span>
                  <Eye
                    size={14}
                    className={`cursor-pointer hover:text-cyan-400 ${
                      selectedRecordId === record.id ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      loadRecord(record.id);
                    }}
                  />
                  <Trash2
                    size={14}
                    className="text-slate-400 cursor-pointer hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecord(record.id);
                    }}
                  />
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(record.createdAt)}
                  </span>
                  <span>α={record.params.angleOfAttack.toFixed(1)}°</span>
                  <span>V={record.params.velocity.toFixed(0)}m/s</span>
                </div>

                {record.notes && (
                  <div className="mt-2 text-xs text-slate-300 line-clamp-1">
                    {record.notes}
                  </div>
                )}
              </div>

              {expandedRecordId === record.id && (
                <div className="px-3 pb-3 border-t border-slate-600 mt-2 pt-3 space-y-2">
                  {record.sourceNote && (
                    <div className="text-xs">
                      <span className="text-slate-400">来源说明: </span>
                      <span className="text-amber-300">{record.sourceNote}</span>
                    </div>
                  )}

                  {record.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {record.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 bg-slate-600 rounded text-xs text-slate-300"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {record.modificationHistory.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                        <History size={12} />
                        修改历史 ({record.modificationHistory.length})
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {record.modificationHistory.slice(-5).map((mod, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-slate-800/50 rounded p-1.5"
                          >
                            <div className="text-slate-400">
                              {formatDate(mod.timestamp)}
                            </div>
                            <div className="text-slate-300">
                              {mod.field}: {String(mod.oldValue)} → {String(mod.newValue)}
                            </div>
                            <div className="text-cyan-400 text-xs">{mod.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
