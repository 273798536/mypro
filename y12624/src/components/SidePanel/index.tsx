import React, { useState } from 'react';
import { MessageSquare, Trash2, Check, AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { statusLabels, statusColors } from '@/data/mockData';
import { getStatusExplanation } from '@/utils/detection';
import { ArrowRecord, RecordStatus } from '@/types';

export const SidePanel: React.FC = () => {
  const { 
    filteredRecords, 
    selectedId, 
    selectRecord, 
    addRemark, 
    updateRecord, 
    deleteRecord 
  } = useCanvasStore();
  
  const [remarkInput, setRemarkInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedRecord = filteredRecords.find(r => r.id === selectedId);

  const handleSaveRemark = () => {
    if (selectedId && remarkInput.trim()) {
      addRemark(selectedId, remarkInput.trim());
      setRemarkInput('');
    }
  };

  const handleStatusChange = (id: string, status: RecordStatus) => {
    updateRecord(id, { status });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const StatusIcon = ({ status }: { status: RecordStatus }) => {
    switch (status) {
      case 'normal':
        return <Check size={14} className="text-fire-success" />;
      case 'flipped':
        return <XCircle size={14} className="text-fire-red" />;
      case 'warning':
        return <AlertTriangle size={14} className="text-fire-warning" />;
      case 'pending':
        return <Clock size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-bold text-slate-100 mb-2">记录列表</h3>
        <p className="text-xs text-slate-400">
          共 {filteredRecords.length} 条记录
          {selectedRecord && ` · 已选中 #${selectedRecord.id}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            暂无符合筛选条件的记录
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`cursor-pointer transition-all ${
                  selectedId === record.id 
                    ? 'bg-slate-700/50' 
                    : 'hover:bg-slate-700/30'
                }`}
                onClick={() => selectRecord(record.id)}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={record.status} />
                      <span className="font-medium text-sm">
                        记录 #{record.id}
                      </span>
                      {record.status === 'flipped' && (
                        <span className="px-1.5 py-0.5 text-xs bg-fire-red/20 text-fire-red rounded">
                          翻转
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(record.id);
                      }}
                      className="p-1 hover:bg-slate-600 rounded"
                    >
                      {expandedId === record.id ? (
                        <ChevronUp size={14} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={14} className="text-slate-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
                    <span>坐标: ({Math.round(record.x)}, {Math.round(record.y)})</span>
                    <span>方向: {record.direction}°</span>
                  </div>

                  {record.remark && (
                    <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-600">
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        {record.isManualRemark ? (
                          <span className="text-fire-warning">【人工备注】</span>
                        ) : (
                          <span>【系统备注】</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300">{record.remark}</p>
                    </div>
                  )}
                </div>

                {expandedId === record.id && (
                  <div className="px-3 pb-3 animate-fade-in">
                    <div className="p-3 bg-slate-900/50 rounded border border-slate-600">
                      <h5 className="text-xs font-medium text-slate-400 mb-2">状态说明</h5>
                      <p className="text-xs text-slate-300">
                        {getStatusExplanation(record.status)}
                      </p>
                      
                      <h5 className="text-xs font-medium text-slate-400 mt-3 mb-2">修改状态</h5>
                      <div className="flex gap-1 flex-wrap">
                        {(['normal', 'flipped', 'warning', 'pending'] as RecordStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(record.id, status);
                            }}
                            className={`px-2 py-1 text-xs rounded border transition-all ${
                              record.status === status
                                ? 'border-transparent text-white'
                                : 'border-slate-600 text-slate-400 hover:border-slate-500'
                            }`}
                            style={{
                              backgroundColor: record.status === status 
                                ? statusColors[status] 
                                : 'transparent'
                            }}
                          >
                            {statusLabels[status]}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('确定要删除这条记录吗？')) {
                            deleteRecord(record.id);
                          }
                        }}
                        className="mt-3 w-full px-2 py-1.5 text-xs rounded border border-fire-red/30 text-fire-red hover:bg-fire-red/10 transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} />
                        删除记录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <h4 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
            <MessageSquare size={16} />
            添加人工备注
          </h4>
          <textarea
            value={remarkInput}
            onChange={(e) => setRemarkInput(e.target.value)}
            placeholder="输入备注内容，将原样保留..."
            className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
          />
          <p className="text-xs text-slate-500 mt-1 mb-2">
            💡 备注将原样保留，不会自动修改
          </p>
          <button
            onClick={handleSaveRemark}
            disabled={!remarkInput.trim()}
            className={`w-full py-2 rounded text-sm font-medium transition-all ${
              remarkInput.trim()
                ? 'bg-fire-dark text-white hover:bg-blue-700'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            保存备注
          </button>
        </div>
      )}
    </div>
  );
};
