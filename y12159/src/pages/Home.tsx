import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RefreshCw, CheckCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import StatsCard from '@/components/StatsCard';
import ResultCard from '@/components/ResultCard';
import ResultDetailPanel from '@/components/ResultDetailPanel';
import SectionTimeline from '@/components/SectionTimeline';
import StatusBadge from '@/components/StatusBadge';

export default function Home() {
  const navigate = useNavigate();
  const {
    judgmentResults,
    selectedResult,
    setSelectedResult,
    isLoading,
    error,
    importState,
    executePhase1Judgment,
    executePhase2Judgment,
    getPhaseComparison,
    runConsistencyCheck,
    thresholdVersions,
    currentThresholdId,
    gapSensorData,
    speedRecords,
  } = useStore();

  const [consistencyResult, setConsistencyResult] = useState<boolean | null>(null);

  const stats = {
    PASS: judgmentResults.filter((r) => r.status === 'PASS').length,
    WARNING: judgmentResults.filter((r) => r.status === 'WARNING').length,
    FAIL: judgmentResults.filter((r) => r.status === 'FAIL').length,
    MISSING: judgmentResults.filter((r) => r.status === 'MISSING').length,
  };

  const currentThreshold = thresholdVersions.find((v) => v.id === currentThresholdId);
  const phaseComparison = getPhaseComparison();

  const handleRunJudgment = () => {
    if (importState.phase === 'PHASE2' && importState.hasSpeedData) {
      executePhase2Judgment();
    } else {
      executePhase1Judgment();
    }
  };

  const handleCheckConsistency = () => {
    const result = runConsistencyCheck();
    setConsistencyResult(result);
    setTimeout(() => setConsistencyResult(null), 3000);
  };

  const canRun = importState.hasGapData && importState.hasCarMapping;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">间隙分析</h1>
          <p className="text-sm text-industrial-muted mt-1">
            当前阈值版本: {currentThreshold?.version || '未设置'}
            {currentThreshold && ` · ${currentThreshold.name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckConsistency}
            disabled={judgmentResults.length === 0}
            className="industrial-btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={consistencyResult !== null ? 'animate-spin' : ''} />
            一致性校验
            {consistencyResult !== null && (
              consistencyResult ? (
                <CheckCircle size={16} className="text-success" />
              ) : (
                <AlertCircle size={16} className="text-danger" />
              )
            )}
          </button>
          <button
            onClick={() => navigate('/import')}
            className="industrial-btn-secondary flex items-center gap-2"
          >
            <FileText size={16} />
            导入数据
          </button>
          <button
            onClick={handleRunJudgment}
            disabled={!canRun || isLoading}
            className="industrial-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} className={isLoading ? 'animate-pulse' : ''} />
            {isLoading ? '计算中...' : importState.phase === 'PHASE2' ? '执行完整判定' : '执行初步判定'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-sm text-danger">
          {error}
        </div>
      )}

      {!canRun && (
        <div className="industrial-card p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-warning/10 rounded-full flex items-center justify-center">
            <AlertCircle size={32} className="text-warning" />
          </div>
          <h3 className="text-lg font-medium mb-2">数据不完整</h3>
          <p className="text-sm text-industrial-muted mb-4">
            请先导入间隙传感器数据和车厢编号映射表
          </p>
          <button
            onClick={() => navigate('/import')}
            className="industrial-btn-primary inline-flex items-center gap-2"
          >
            前往导入
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {canRun && judgmentResults.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatsCard status="PASS" count={stats.PASS} total={judgmentResults.length} />
            <StatsCard status="WARNING" count={stats.WARNING} total={judgmentResults.length} />
            <StatsCard status="FAIL" count={stats.FAIL} total={judgmentResults.length} />
            <StatsCard status="MISSING" count={stats.MISSING} total={judgmentResults.length} />
          </div>

          <SectionTimeline
            results={judgmentResults}
            selectedId={selectedResult?.id || null}
            onSelect={setSelectedResult}
          />

          {phaseComparison && phaseComparison.changed.length > 0 && (
            <div className="industrial-card p-4 border-l-4 border-primary">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw size={16} className="text-primary" />
                <h3 className="font-medium">两阶段变化对比</h3>
                <span className="text-xs text-industrial-muted">
                  补充速度记录后，{phaseComparison.changed.length} 个区段结果发生变化
                </span>
              </div>
              <div className="space-y-2">
                {phaseComparison.changed.map((change, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-industrial-bg rounded-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{change.sectionId}</span>
                      <StatusBadge status={change.oldStatus} />
                      <ArrowRight size={14} className="text-industrial-muted" />
                      <StatusBadge status={change.newStatus} />
                    </div>
                    <div className="text-xs text-industrial-muted">
                      {change.changes.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="industrial-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">区段详情</h3>
              <div className="flex items-center gap-2 text-xs text-industrial-muted">
                <span>共 {judgmentResults.length} 个区段</span>
                <span>·</span>
                <span>间隙单位: mm</span>
                <span>·</span>
                <span>速度单位: km/h</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {judgmentResults.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onClick={() => setSelectedResult(result)}
                  selected={selectedResult?.id === result.id}
                  highlightChanges={phaseComparison?.changed.some((c) => c.sectionId === result.sectionId)}
                />
              ))}
            </div>
          </div>

          <div className="industrial-card p-4">
            <h3 className="font-medium mb-4">数据概览</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-industrial-bg rounded-sm">
                <p className="text-2xl font-mono font-bold">{gapSensorData.length}</p>
                <p className="text-xs text-industrial-muted mt-1">间隙采样点</p>
              </div>
              <div className="p-3 bg-industrial-bg rounded-sm">
                <p className="text-2xl font-mono font-bold">{speedRecords.length}</p>
                <p className="text-xs text-industrial-muted mt-1">速度记录</p>
              </div>
              <div className="p-3 bg-industrial-bg rounded-sm">
                <p className="text-2xl font-mono font-bold">{new Set(gapSensorData.map(d => d.sensorId)).size}</p>
                <p className="text-xs text-industrial-muted mt-1">传感器数量</p>
              </div>
              <div className="p-3 bg-industrial-bg rounded-sm">
                <p className="text-2xl font-mono font-bold">{new Set(gapSensorData.map(d => d.sectionId)).size}</p>
                <p className="text-xs text-industrial-muted mt-1">监测区段</p>
              </div>
            </div>
          </div>
        </>
      )}

      <ResultDetailPanel
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </div>
  );
}
