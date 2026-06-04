import { useState, useRef, useEffect } from 'react';
import { Clock, ZoomIn, Move, Grid3X3, Edit3, Ruler, RefreshCw, FileUp, RotateCcw, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { STATUS_COLOR_MAP } from '@/constants/colorRules';
import type { ActionType } from '@/types';

const actionIcons: Record<ActionType, React.ReactNode> = {
  'zoom': <ZoomIn className="w-4 h-4" />,
  'pan': <Move className="w-4 h-4" />,
  'snap': <Grid3X3 className="w-4 h-4" />,
  'tank-move': <Edit3 className="w-4 h-4" />,
  'scale-change': <Ruler className="w-4 h-4" />,
  'recovery': <RefreshCw className="w-4 h-4" />,
  'load-sample': <FileUp className="w-4 h-4" />,
  'reset': <RotateCcw className="w-4 h-4" />
};

const actionLabels: Record<ActionType, string> = {
  'zoom': '画布缩放',
  'pan': '画布平移',
  'snap': '网格吸附',
  'tank-move': '展缸移动',
  'scale-change': '比例尺变更',
  'recovery': '数据恢复',
  'load-sample': '加载样例',
  'reset': '重置画布'
};

export function RecordsTimeline() {
  const { records, tanks, setSelectedTankId } = useCanvasStore();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && records.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [records.length]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const getTankName = (tankId?: string) => {
    if (!tankId) return null;
    return tanks.find(t => t.id === tankId)?.name;
  };

  const handleRecordClick = (record: typeof records[0]) => {
    setSelectedRecordId(record.id === selectedRecordId ? null : record.id);
    if (record.relatedTankId) {
      setSelectedTankId(record.relatedTankId);
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const errorCount = records.filter(r => r.isError).length;
  const recoveryCount = records.filter(r => r.type === 'recovery').length;

  return (
    <div className="h-44 bg-white/90 backdrop-blur-md border-t border-ocean-200 relative">
      <div className="absolute top-0 left-0 right-0 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-white to-transparent z-10">
        <div className="flex items-center gap-4">
          <h4 className="font-display text-lg text-ocean-700 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            处理记录时间线
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">共 {records.length} 条</span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                错误 {errorCount}
              </span>
            )}
            {recoveryCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                恢复 {recoveryCount}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          💡 缩放/平移/吸附共用同一批记录，界面和报告数据一致
        </div>
      </div>

      <button
        onClick={scrollLeft}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-white rounded-full shadow-md hover:bg-ocean-50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-ocean-700" />
      </button>

      <button
        onClick={scrollRight}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-white rounded-full shadow-md hover:bg-ocean-50 transition-colors"
      >
        <ChevronRight className="w-4 h-4 text-ocean-700" />
      </button>

      <div
        ref={scrollRef}
        className="h-full overflow-x-auto scrollbar-thin pt-12 px-8"
      >
        <div className="flex items-end gap-4 min-w-max pb-4 px-4" style={{ minHeight: '120px' }}>
          {records.length === 0 ? (
            <div className="w-full text-center py-8 text-gray-400">
              <p className="text-sm">暂无操作记录</p>
              <p className="text-xs mt-1">尝试移动展缸、缩放画布或触发错误演示</p>
            </div>
          ) : (
            records.map((record, index) => {
              const isSelected = selectedRecordId === record.id;
              const isError = record.isError;
              const isRecovery = record.type === 'recovery';
              const tankName = getTankName(record.relatedTankId);
              
              const nodeColor = isError 
                ? STATUS_COLOR_MAP.error 
                : isRecovery 
                  ? STATUS_COLOR_MAP.recovered 
                  : '#2980B9';

              return (
                <div
                  key={record.id}
                  className="flex flex-col items-center relative"
                >
                  {index < records.length - 1 && (
                    <div
                      className="absolute top-10 left-1/2 h-0.5 bg-ocean-200"
                      style={{ width: 'calc(100% + 16px)' }}
                    />
                  )}
                  
                  <button
                    onClick={() => handleRecordClick(record)}
                    className={`relative z-10 flex flex-col items-center group transition-transform ${
                      isSelected ? 'scale-110' : 'hover:scale-105'
                    }`}
                  >
                    <span className="text-xs text-gray-400 mb-1">
                      {formatTime(record.timestamp)}
                    </span>
                    
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                        isSelected ? 'ring-4 ring-ocean-200' : ''
                      }`}
                      style={{ backgroundColor: nodeColor }}
                    >
                      {isError ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isRecovery ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        actionIcons[record.type]
                      )}
                    </div>
                    
                    <span className="text-xs font-medium mt-1 text-gray-700 whitespace-nowrap">
                      {actionLabels[record.type]}
                    </span>
                    {tankName && (
                      <span className="text-xs text-ocean-600 whitespace-nowrap">
                        {tankName}
                      </span>
                    )}
                  </button>

                  {isSelected && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-3 w-64 z-30 border border-ocean-100">
                      <div className="text-sm font-medium text-ocean-800 mb-2">
                        {record.description}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>操作人：{record.operator}</p>
                        <p>时间：{new Date(record.timestamp).toLocaleString()}</p>
                        {record.beforeValue !== undefined && (
                          <p>
                            变更前：<code className="bg-gray-100 px-1 rounded">{JSON.stringify(record.beforeValue)}</code>
                          </p>
                        )}
                        {record.afterValue !== undefined && (
                          <p>
                            变更后：<code className="bg-gray-100 px-1 rounded">{JSON.stringify(record.afterValue)}</code>
                          </p>
                        )}
                      </div>
                      {isError && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600">
                          ⚠️ 此为错误操作，请注意比例尺问题
                        </div>
                      )}
                      {isRecovery && (
                        <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-600">
                          ✅ 已恢复正确设置
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
    </div>
  );
}
