import React from 'react';
import { AlertTriangle, Thermometer, Clock, Shield } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useAuditStore } from '@/store/auditStore';
import { formatExceptionType, formatActionType } from '@/utils/export';

export const ExceptionFilter: React.FC = () => {
  const { exceptions } = useGameStore();
  const { filterType, setFilterType, markAsReviewed, reviewedExceptions } = useAuditStore();

  const filteredExceptions = exceptions.filter(e => 
    filterType === 'all' || e.type === filterType
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'temperature_bound': return <Thermometer size={16} className="text-orange-500" />;
      case 'conservation_error': return <Shield size={16} className="text-red-500" />;
      case 'timeout': return <Clock size={16} className="text-blue-500" />;
      default: return <AlertTriangle size={16} />;
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 font-display">异常记录筛选</h3>
      
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all', label: '全部' },
          { value: 'temperature_bound', label: '温度越界' },
          { value: 'conservation_error', label: '守恒错误' },
          { value: 'timeout', label: '订单超时' },
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setFilterType(option.value as any)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterType === option.value
                ? 'bg-coffee-dark text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      <div className="text-sm text-gray-500 mb-4">
        共 {filteredExceptions.length} 条异常记录
      </div>
      
      {filteredExceptions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          暂无异常记录
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredExceptions.map(exception => (
            <div
              key={exception.id}
              className={`p-3 rounded-lg border ${
                reviewedExceptions.includes(exception.id)
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getIcon(exception.type)}
                  <span className="font-medium">
                    {formatExceptionType(exception.type)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(exception.timestamp).toLocaleTimeString()}
                  </span>
                  {!reviewedExceptions.includes(exception.id) && (
                    <button
                      onClick={() => markAsReviewed(exception.id)}
                      className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      标记已复核
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                <div>操作ID: {exception.actionId}</div>
                {exception.details.temperature !== undefined && (
                  <div>异常温度: {exception.details.temperature.toFixed(1)}°C</div>
                )}
                {exception.details.conservationError !== undefined && (
                  <div>守恒误差: {(exception.details.conservationError * 100).toFixed(2)}%</div>
                )}
                {exception.details.elapsedTime !== undefined && (
                  <div>超时: {(exception.details.elapsedTime - (exception.details.timeLimit || 0)).toFixed(1)}秒</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
