import { useState, useMemo } from 'react';
import { 
  GitCompare, 
  ChevronRight, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { classifyCheckResults } from '../engine/scheduleEngine';
import { PhaseBadge, SampleTypeBadge, AssignmentStatusBadge } from '../components/StatusBadge';
import type { Snapshot, CheckResult } from '../types';

export function ChangeCompare() {
  const { snapshots, compareSnapshots, comparisonResult, selectedSnapshotIds } = useScheduleStore();
  
  const [beforeId, setBeforeId] = useState<string>(selectedSnapshotIds[0] || '');
  const [afterId, setAfterId] = useState<string>(selectedSnapshotIds[1] || '');
  
  const beforeSnapshot = useMemo(() => 
    snapshots.find(s => s.id === beforeId), 
    [snapshots, beforeId]
  );
  
  const afterSnapshot = useMemo(() => 
    snapshots.find(s => s.id === afterId), 
    [snapshots, afterId]
  );
  
  const handleCompare = () => {
    if (beforeId && afterId && beforeId !== afterId) {
      compareSnapshots(beforeId, afterId);
    }
  };
  
  const beforeClassified = beforeSnapshot ? classifyCheckResults(beforeSnapshot.checkResults) : null;
  const afterClassified = afterSnapshot ? classifyCheckResults(afterSnapshot.checkResults) : null;
  
  const result = comparisonResult;
  
  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added': return <TrendingUp className="w-4 h-4 text-forest-600" />;
      case 'removed': return <TrendingDown className="w-4 h-4 text-wine-600" />;
      case 'modified': return <ArrowRight className="w-4 h-4 text-amber-600" />;
      default: return <Minus className="w-4 h-4 text-navy-400" />;
    }
  };
  
  const getChangeClass = (changeType: string) => {
    switch (changeType) {
      case 'added': return 'diff-added';
      case 'removed': return 'diff-removed';
      case 'modified': return 'diff-modified';
      default: return '';
    }
  };
  
  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? '是' : '否';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };
  
  const getResultFromSnapshot = (snapshot: Snapshot, assignmentId: string): CheckResult | undefined => {
    return snapshot.checkResults.find(r => r.assignment.id === assignmentId);
  };
  
  if (snapshots.length < 2) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <GitCompare className="w-12 h-12 text-navy-400 mx-auto mb-4" />
          <p className="text-navy-600 mb-2">需要至少两个快照才能对比</p>
          <p className="text-sm text-navy-500">请先完成两阶段数据导入</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            变化对比
          </h1>
          <p className="text-navy-500 mt-1">
            对比不同阶段的排班检查结果，清晰查看变化
          </p>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          选择对比快照
        </div>
        <div className="card-body">
          <div className="flex items-end gap-6">
            <div className="flex-1">
              <label className="label">对比前（较早）</label>
              <select 
                className="input"
                value={beforeId}
                onChange={(e) => setBeforeId(e.target.value)}
              >
                <option value="">请选择快照...</option>
                {snapshots.map(snapshot => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.description} - {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pb-2">
              <ArrowRight className="w-6 h-6 text-navy-400" />
            </div>
            
            <div className="flex-1">
              <label className="label">对比后（较新）</label>
              <select 
                className="input"
                value={afterId}
                onChange={(e) => setAfterId(e.target.value)}
              >
                <option value="">请选择快照...</option>
                {snapshots.map(snapshot => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.description} - {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleCompare}
              disabled={!beforeId || !afterId || beforeId === afterId}
              className="btn btn-primary flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" />
              开始对比
            </button>
          </div>
        </div>
      </div>
      
      {beforeSnapshot && afterSnapshot && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span>对比前</span>
              <PhaseBadge phase={beforeSnapshot.phase} />
            </div>
            <div className="card-body">
              <p className="text-sm text-navy-500 mb-4">{beforeSnapshot.description}</p>
              <p className="text-xs text-navy-400 mb-4">
                {new Date(beforeSnapshot.timestamp).toLocaleString('zh-CN')}
              </p>
              {beforeClassified && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-forest-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-forest-600">{beforeClassified.normal.length}</p>
                    <p className="text-xs text-forest-700">正常</p>
                  </div>
                  <div className="bg-amber-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{beforeClassified.boundary.length}</p>
                    <p className="text-xs text-amber-700">边界</p>
                  </div>
                  <div className="bg-wine-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-wine-600">{beforeClassified.bad.length}</p>
                    <p className="text-xs text-wine-700">异常</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span>对比后</span>
              <PhaseBadge phase={afterSnapshot.phase} />
            </div>
            <div className="card-body">
              <p className="text-sm text-navy-500 mb-4">{afterSnapshot.description}</p>
              <p className="text-xs text-navy-400 mb-4">
                {new Date(afterSnapshot.timestamp).toLocaleString('zh-CN')}
              </p>
              {afterClassified && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-forest-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-forest-600">{afterClassified.normal.length}</p>
                    <p className="text-xs text-forest-700">正常</p>
                  </div>
                  <div className="bg-amber-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{afterClassified.boundary.length}</p>
                    <p className="text-xs text-amber-700">边界</p>
                  </div>
                  <div className="bg-wine-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-wine-600">{afterClassified.bad.length}</p>
                    <p className="text-xs text-wine-700">异常</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {result && (
        <>
          <div className="card">
            <div className="card-header">
              变化汇总
            </div>
            <div className="card-body">
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-navy-50 rounded p-4 text-center">
                  <p className="text-3xl font-bold text-navy-700">{result.summary.totalChanges}</p>
                  <p className="text-sm text-navy-500">总变化数</p>
                </div>
                <div className="bg-forest-50 rounded p-4 text-center">
                  <p className="text-3xl font-bold text-forest-600">{result.summary.newAssignments}</p>
                  <p className="text-sm text-forest-600">新增分配</p>
                </div>
                <div className="bg-wine-50 rounded p-4 text-center">
                  <p className="text-3xl font-bold text-wine-600">{result.summary.removedAssignments}</p>
                  <p className="text-sm text-wine-600">移除分配</p>
                </div>
                <div className="bg-amber-50 rounded p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{result.summary.statusChanges}</p>
                  <p className="text-sm text-amber-600">状态变更</p>
                </div>
                <div className="bg-navy-50 rounded p-4 text-center">
                  <p className="text-3xl font-bold text-navy-600">{result.summary.sampleTypeChanges}</p>
                  <p className="text-sm text-navy-500">样本类型变更</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              详细变化
            </div>
            <div className="card-body">
              {result.differences.length === 0 ? (
                <p className="text-center text-navy-500 py-8">
                  两次检查结果完全一致，没有变化
                </p>
              ) : (
                <div className="space-y-4">
                  {result.differences.map((diff, idx) => {
                    const beforeResult = beforeSnapshot ? getResultFromSnapshot(beforeSnapshot, diff.assignmentId) : null;
                    const afterResult = afterSnapshot ? getResultFromSnapshot(afterSnapshot, diff.assignmentId) : null;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded border ${getChangeClass(diff.changeType)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getChangeIcon(diff.changeType)}
                            <div>
                              <p className="font-medium text-navy-900">
                                {diff.volunteerName} → {diff.positionName}
                              </p>
                              <p className="text-sm text-navy-500">
                                字段: {diff.field}
                              </p>
                            </div>
                          </div>
                          <span className={`badge ${
                            diff.impact === 'high' ? 'bg-wine-100 text-wine-800' :
                            diff.impact === 'medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-navy-100 text-navy-800'
                          }`}>
                            {diff.impact === 'high' ? '高影响' : diff.impact === 'medium' ? '中影响' : '低影响'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/50 rounded p-3">
                            <p className="text-xs text-navy-500 mb-1">变更前</p>
                            {beforeResult ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <SampleTypeBadge type={beforeResult.sampleType} />
                                  <AssignmentStatusBadge status={beforeResult.assignment.status} />
                                </div>
                                {diff.before !== null && (
                                  <p className="text-sm text-navy-600">
                                    {formatValue(diff.before)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-navy-400">（无记录）</p>
                            )}
                          </div>
                          <div className="bg-white/50 rounded p-3">
                            <p className="text-xs text-navy-500 mb-1">变更后</p>
                            {afterResult ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <SampleTypeBadge type={afterResult.sampleType} />
                                  <AssignmentStatusBadge status={afterResult.assignment.status} />
                                </div>
                                {diff.after !== null && (
                                  <p className="text-sm text-navy-600">
                                    {formatValue(diff.after)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-navy-400">（已移除）</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
