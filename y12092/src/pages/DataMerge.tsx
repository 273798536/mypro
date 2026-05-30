import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { findMergeConflicts, getFieldLabel, getFieldUnit } from '@/utils/dataMerge';
import { GitMerge, Check, X, ArrowLeftRight, User, Clock, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

export default function DataMerge() {
  const {
    mergeSourceA,
    mergeSourceB,
    mergeDecisions,
    loadMergeData,
    makeMergeDecision,
    applyMerge,
  } = useAppStore();
  
  useEffect(() => {
    loadMergeData();
  }, [loadMergeData]);
  
  const conflicts = findMergeConflicts(mergeSourceA, mergeSourceB);
  
  const getDecision = (cameraId: string, fieldName: string) => {
    return mergeDecisions.find(d => d.cameraId === cameraId && d.fieldName === fieldName);
  };
  
  const getCamera = (id: string, source: 'A' | 'B') => {
    const sourceData = source === 'A' ? mergeSourceA : mergeSourceB;
    return sourceData.find(c => c.id === id);
  };
  
  const groupedConflicts = conflicts.reduce((acc, conflict) => {
    if (!acc[conflict.cameraId]) {
      acc[conflict.cameraId] = [];
    }
    acc[conflict.cameraId].push(conflict);
    return acc;
  }, {} as Record<string, typeof conflicts>);
  
  const resolvedCount = conflicts.filter(
    c => getDecision(c.cameraId, c.fieldName)
  ).length;
  
  const allResolved = resolvedCount === conflicts.length && conflicts.length > 0;
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-blue-400" />
              数据合并工作台
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              合并多源机位数据，逐项裁决冲突，不自动选择
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">
                冲突项: <span className="text-orange-400 font-medium">{conflicts.length}</span>
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">
                已裁决: <span className="text-green-400 font-medium">{resolvedCount}</span>
              </span>
            </div>
            
            <button
              onClick={applyMerge}
              disabled={!allResolved}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
                allResolved
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              应用合并
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="text-white font-medium text-sm">数据源 A</h3>
              <span className="text-xs text-gray-500 ml-auto">{mergeSourceA.length} 个机位</span>
            </div>
            <p className="text-xs text-gray-500">导播组-A 提交的机位方案</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <h3 className="text-white font-medium text-sm">数据源 B</h3>
              <span className="text-xs text-gray-500 ml-auto">{mergeSourceB.length} 个机位</span>
            </div>
            <p className="text-xs text-gray-500">导播组-B 提交的机位方案</p>
          </div>
        </div>
        
        {conflicts.length === 0 ? (
          <div className="text-center py-16">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400 text-lg">数据完全一致，无冲突</p>
            <p className="text-gray-600 text-sm mt-1">两路数据源的机位参数完全相同</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedConflicts).map(([cameraId, cameraConflicts]) => {
              const cameraA = getCamera(cameraId, 'A');
              const cameraB = getCamera(cameraId, 'B');
              const camera = cameraA || cameraB;
              const cameraResolved = cameraConflicts.every(c => getDecision(c.cameraId, c.fieldName));
              
              return (
                <div
                  key={cameraId}
                  className={`bg-gray-800/30 rounded-lg border transition-all ${
                    cameraResolved ? 'border-green-700/50' : 'border-orange-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg ${
                        cameraResolved ? 'bg-green-600/20 text-green-400' : 'bg-orange-600/20 text-orange-400'
                      }`}>
                        {camera?.number}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{camera?.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {cameraA?.operator || '-'}
                          <span className="text-gray-700">/</span>
                          {cameraB?.operator || '-'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {cameraResolved ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <Check className="w-3 h-3" />
                          已裁决
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-400 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          {cameraConflicts.length} 项冲突
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-700">
                    {cameraConflicts.map((conflict, index) => {
                      const decision = getDecision(conflict.cameraId, conflict.fieldName);
                      const unit = getFieldUnit(conflict.fieldName);
                      
                      return (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ArrowLeftRight className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-300">
                                {getFieldLabel(conflict.fieldName)}
                              </span>
                              {decision && (
                                <StatusBadge
                                  type="status"
                                  value="resolved"
                                  size="sm"
                                />
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 items-center">
                            <div className={`p-3 rounded transition-all ${
                              decision?.choice === 'a'
                                ? 'bg-blue-600/30 border-2 border-blue-500'
                                : 'bg-gray-800/50 border border-gray-700'
                            }`}>
                              <div className="text-xs text-blue-400 mb-1">数据源 A</div>
                              <div className="font-mono text-white text-lg">
                                {String(conflict.valueA)}{unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {cameraA?.operator}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-xs text-gray-500">选择保留</div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => makeMergeDecision(conflict.cameraId, conflict.fieldName, 'a')}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                    decision?.choice === 'a'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                                  }`}
                                >
                                  保留 A
                                </button>
                                <button
                                  onClick={() => makeMergeDecision(conflict.cameraId, conflict.fieldName, 'b')}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                    decision?.choice === 'b'
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                                  }`}
                                >
                                  保留 B
                                </button>
                              </div>
                              {decision && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(decision.decidedAt).toLocaleString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              )}
                            </div>
                            
                            <div className={`p-3 rounded transition-all ${
                              decision?.choice === 'b'
                                ? 'bg-purple-600/30 border-2 border-purple-500'
                                : 'bg-gray-800/50 border border-gray-700'
                            }`}>
                              <div className="text-xs text-purple-400 mb-1">数据源 B</div>
                              <div className="font-mono text-white text-lg">
                                {String(conflict.valueB)}{unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {cameraB?.operator}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
