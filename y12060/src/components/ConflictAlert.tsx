import { AlertTriangle, ArrowLeftRight, ArrowUpDown, EyeOff, Weight, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { DataConflict } from '../types/game';
import { explainConflictInPlainChinese, getConflictColor, getConflictBgColor, getConflictBorderColor } from '../utils/conflictCheck';

interface ConflictAlertProps {
  conflicts: DataConflict[];
  onClose?: () => void;
  showDetails?: boolean;
}

export function ConflictAlert({ conflicts, onClose, showDetails = true }: ConflictAlertProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  if (conflicts.length === 0) return null;
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'aisle_width': return ArrowLeftRight;
      case 'height_mismatch': return ArrowUpDown;
      case 'blindzone_overlap': return EyeOff;
      case 'load_exceed': return Weight;
      default: return AlertTriangle;
    }
  };
  
  const dangerCount = conflicts.filter(c => c.riskLevel === 'danger').length;
  const warningCount = conflicts.filter(c => c.riskLevel === 'warning').length;
  
  return (
    <div className={`rounded-xl border-2 ${dangerCount > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-yellow-500/50 bg-yellow-500/10'} overflow-hidden`}>
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${dangerCount > 0 ? 'text-red-500' : 'text-yellow-500'} animate-pulse`} />
            <div>
              <h3 className="font-bold text-white">
                ⚠️ 检测到 {conflicts.length} 项参数配置冲突
              </h3>
              <p className="text-sm text-gray-400">
                叉车参数由设备部维护，货架参数由仓储部维护，合并时发现以下问题
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
        
        <div className="flex gap-4 mt-3">
          {dangerCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-red-400">{dangerCount} 项危险</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-yellow-400">{warningCount} 项警告</span>
            </div>
          )}
        </div>
      </div>
      
      {showDetails && (
        <div className="divide-y divide-gray-700/50">
          {conflicts.map((conflict) => {
            const Icon = getIcon(conflict.type);
            const isExpanded = expandedId === conflict.id;
            const color = getConflictColor(conflict.riskLevel);
            
            return (
              <div
                key={conflict.id}
                className={`p-4 ${getConflictBgColor(conflict.riskLevel)}`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : conflict.id)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" style={{ color }} />
                    <div>
                      <div className="font-medium text-white flex items-center gap-2">
                        {conflict.forkliftParam} <span className="text-gray-500">vs</span> {conflict.shelfParam}
                        <span 
                          className={`text-xs px-2 py-0.5 rounded ${conflict.riskLevel === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                        >
                          {conflict.riskLevel === 'danger' ? '危险' : '警告'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        <span className="text-blue-400">{conflict.forkliftValue}</span>
                        <span className="mx-2">≠</span>
                        <span className="text-orange-400">{conflict.shelfValue}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                {isExpanded && (
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <h4 className="text-sm font-bold text-white mb-2">🔍 人话解释</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {explainConflictInPlainChinese(conflict)}
                    </p>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <div className="text-xs text-blue-400 mb-1">叉车参数</div>
                        <div className="text-white font-bold">{conflict.forkliftParam}: {conflict.forkliftValue}</div>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                        <div className="text-xs text-orange-400 mb-1">货架参数</div>
                        <div className="text-white font-bold">{conflict.shelfParam}: {conflict.shelfValue}</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">官方描述</div>
                      <p className="text-sm text-gray-300">{conflict.description}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="p-4 bg-gray-900/30 border-t border-gray-700/50">
        <p className="text-xs text-gray-500 text-center">
          💡 建议在开始训练前联系相关维护人员解决这些冲突，以确保训练数据的准确性
        </p>
      </div>
    </div>
  );
}
