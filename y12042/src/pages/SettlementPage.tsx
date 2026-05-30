import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, CheckCircle, AlertTriangle, Zap, Clock, Battery, Wrench, FileJson, FileSpreadsheet, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { cn } from '../lib/utils';
import { getScoreRating } from '../engine/ScoringEngine';
import { getAnomalyTypeLabel, getAnomalyTypeColor, getAnomalyStats, groupAnomaliesByType } from '../utils/anomalyFilter';
import { exportScoreReport, exportFullChainReport, exportOperationLog, exportAnomalyReport, formatPowerToScoreChainSummary } from '../utils/exporter';
import type { AnomalyType } from '../engine/types';

export const SettlementPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    gameState,
    currentLevel,
    gameId,
    shortCircuitEvents,
    calculateFinalScore,
    buildFullChain,
    markAsReviewed,
    getFilteredAnomalies,
  } = useGameStore();

  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyType | 'all'>('all');
  const [showChainSummary, setShowChainSummary] = useState(false);
  const [expandedDeductions, setExpandedDeductions] = useState<Set<number>>(new Set());

  const score = useMemo(() => calculateFinalScore(), [calculateFinalScore]);
  const fullChain = useMemo(() => buildFullChain(), [buildFullChain]);
  const chainSummary = useMemo(() => fullChain ? formatPowerToScoreChainSummary(fullChain) : '', [fullChain]);
  const scoreRating = useMemo(() => score ? getScoreRating(score.totalScore) : { rating: 'N/A', color: 'text-text-muted' }, [score]);
  const anomalyStats = useMemo(() => getAnomalyStats(gameState.anomalies), [gameState.anomalies]);
  const groupedAnomalies = useMemo(() => groupAnomaliesByType(gameState.anomalies), [gameState.anomalies]);

  const filteredAnomalies = useMemo(() => {
    if (anomalyFilter === 'all') return gameState.anomalies;
    return getFilteredAnomalies(anomalyFilter);
  }, [anomalyFilter, gameState.anomalies, getFilteredAnomalies]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleDeduction = (index: number) => {
    setExpandedDeductions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleExport = (type: 'score' | 'full_chain' | 'operations' | 'anomalies', format: 'csv' | 'json') => {
    if (!score || !currentLevel) return;

    switch (type) {
      case 'score':
        exportScoreReport(score, currentLevel.name, gameId, format);
        break;
      case 'full_chain':
        if (fullChain) {
          exportFullChainReport(fullChain, currentLevel.name, gameId, format);
        }
        break;
      case 'operations':
        exportOperationLog(gameState.operationLog, currentLevel.name, gameId);
        break;
      case 'anomalies':
        exportAnomalyReport(gameState.anomalies, currentLevel.name, gameId);
        break;
    }
  };

  if (!score || !currentLevel) {
    return (
      <div className="min-h-screen bg-circuit-bg flex items-center justify-center">
        <div className="text-center text-text-secondary">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning-amber" />
          <p className="font-mono">暂无结算数据，请先完成游戏</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-power-blue/20 border border-power-blue text-power-blue rounded-lg font-mono text-sm hover:bg-power-blue/30 transition-all"
          >
            返回主菜单
          </button>
        </div>
      </div>
    );
  }

  const totalDeductions = score.deductions.reduce((s, d) => s + d.amount, 0);
  const totalBonuses = score.bonuses.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="min-h-screen bg-circuit-bg text-text-primary relative overflow-hidden py-8">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(77, 166, 255, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(77, 166, 255, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-circuit-border bg-circuit-card/50 text-text-secondary hover:border-power-blue hover:text-power-blue transition-all font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回主菜单
          </button>

          <h1 className="font-display text-2xl">结算复盘</h1>

          <div className="text-xs font-mono text-text-muted">
            游戏ID: {gameId.slice(-8)}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm text-center">
            <div className="mb-4">
              <span className={cn(
                'font-display text-7xl',
                scoreRating.color
              )}>
                {scoreRating.rating}
              </span>
            </div>
            <div className="font-display text-4xl text-text-primary mb-2">
              {score.totalScore}
            </div>
            <div className="text-sm text-text-secondary font-mono">
              基础分 {score.baseScore} - 扣分 {totalDeductions} + 加成 {totalBonuses}
            </div>
            <div className={cn(
              'mt-3 inline-block px-4 py-1 rounded-full text-sm font-mono',
              gameState.gameResult === 'win' 
                ? 'bg-success-green/20 text-success-green' 
                : 'bg-danger-red/20 text-danger-red'
            )}>
              {gameState.gameResult === 'win' ? '✓ 任务完成' : '✗ 任务失败'}
            </div>
          </div>

          <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
            <h3 className="font-display text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-power-blue" />
              游戏统计
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-mono text-sm">关卡</span>
                <span className="text-text-primary font-mono">{currentLevel.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-mono text-sm">用时</span>
                <span className="text-text-primary font-mono">{formatTime(gameState.timeElapsed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-mono text-sm">操作次数</span>
                <span className="text-text-primary font-mono">{gameState.operationLog.length} 次</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-mono text-sm">短路事件</span>
                <span className="text-danger-red font-mono">{shortCircuitEvents.length} 次</span>
              </div>
            </div>
          </div>

          <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
            <h3 className="font-display text-lg mb-4 flex items-center gap-2">
              <Battery className="w-5 h-5 text-success-green" />
              资源分配
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-secondary font-mono text-sm flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" />
                    维修工具
                  </span>
                  <span className={cn(
                    'font-mono',
                    score.resourceAllocation.repairKits.used > score.resourceAllocation.repairKits.allocated
                      ? 'text-danger-red'
                      : 'text-success-green'
                  )}>
                    {score.resourceAllocation.repairKits.used} / {score.resourceAllocation.repairKits.allocated}
                  </span>
                </div>
                <div className="h-2 bg-circuit-border rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      score.resourceAllocation.repairKits.used > score.resourceAllocation.repairKits.allocated
                        ? 'bg-danger-red'
                        : 'bg-success-green'
                    )}
                    style={{ width: `${Math.min(100, (score.resourceAllocation.repairKits.used / score.resourceAllocation.repairKits.allocated) * 100)}%` }}
                  />
                </div>
                {score.resourceAllocation.repairKits.used > score.resourceAllocation.repairKits.allocated && (
                  <p className="text-xs text-danger-red mt-1 font-mono">
                    超额使用 {(score.resourceAllocation.repairKits.used - score.resourceAllocation.repairKits.allocated)} 个
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-secondary font-mono text-sm flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    电量消耗
                  </span>
                  <span className="text-power-blue font-mono">
                    {score.resourceAllocation.powerUnits.used} / {score.resourceAllocation.powerUnits.allocated} W
                  </span>
                </div>
                <div className="h-2 bg-circuit-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-power-blue transition-all"
                    style={{ width: `${(score.resourceAllocation.powerUnits.used / score.resourceAllocation.powerUnits.allocated) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1 font-mono">
                  使用效率: {((1 - score.resourceAllocation.powerUnits.used / score.resourceAllocation.powerUnits.allocated) * 100).toFixed(1)}% 剩余
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
            <h3 className="font-display text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-red" />
              扣分明细
            </h3>
            {score.deductions.length > 0 ? (
              <div className="space-y-3">
                {score.deductions.map((deduction, index) => (
                  <div key={index} className="bg-circuit-dark/50 rounded-lg border border-circuit-border overflow-hidden">
                    <button
                      onClick={() => toggleDeduction(index)}
                      className="w-full p-3 flex items-center justify-between hover:bg-circuit-dark/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-danger-red font-mono">-{deduction.amount}</span>
                        <span className="text-text-primary text-sm">{deduction.reason}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted font-mono">
                          影响 {deduction.cells.length} 个单元
                        </span>
                        {expandedDeductions.has(index) ? (
                          <ChevronUp className="w-4 h-4 text-text-muted" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                    </button>
                    {expandedDeductions.has(index) && (
                      <div className="px-3 pb-3 border-t border-circuit-border">
                        <p className="text-xs text-text-secondary font-mono mt-2 mb-1">影响单元:</p>
                        <div className="flex flex-wrap gap-1">
                          {deduction.cells.map((cell, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-danger-red/10 text-danger-red rounded font-mono">
                              {cell}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-green" />
                <p className="font-mono">无扣分记录</p>
              </div>
            )}
          </div>

          <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
            <h3 className="font-display text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-success-green" />
              加成明细
            </h3>
            {score.bonuses.length > 0 ? (
              <div className="space-y-3">
                {score.bonuses.map((bonus, index) => (
                  <div key={index} className="bg-circuit-dark/50 rounded-lg border border-circuit-border p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-success-green font-mono">+{bonus.amount}</span>
                      <span className="text-text-primary text-sm">{bonus.reason}</span>
                    </div>
                    <CheckCircle className="w-4 h-4 text-success-green" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-warning-amber" />
                <p className="font-mono">暂无加成奖励</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning-amber" />
              异常事件追溯
              <span className="text-xs text-text-muted font-mono ml-2">
                {anomalyStats.unreviewed} 条待复核
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <div className="flex gap-1">
                <button
                  onClick={() => setAnomalyFilter('all')}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono transition-all',
                    anomalyFilter === 'all'
                      ? 'bg-power-blue/20 text-power-blue border border-power-blue/50'
                      : 'text-text-secondary hover:text-power-blue'
                  )}
                >
                  全部 ({anomalyStats.total})
                </button>
                <button
                  onClick={() => setAnomalyFilter('short_circuit')}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono transition-all',
                    anomalyFilter === 'short_circuit'
                      ? 'bg-danger-red/20 text-danger-red border border-danger-red/50'
                      : 'text-text-secondary hover:text-danger-red'
                  )}
                >
                  短路 ({anomalyStats.shortCircuit})
                </button>
                <button
                  onClick={() => setAnomalyFilter('low_power')}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono transition-all',
                    anomalyFilter === 'low_power'
                      ? 'bg-warning-amber/20 text-warning-amber border border-warning-amber/50'
                      : 'text-text-secondary hover:text-warning-amber'
                  )}
                >
                  电量 ({anomalyStats.lowPower})
                </button>
                <button
                  onClick={() => setAnomalyFilter('path_blocked')}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono transition-all',
                    anomalyFilter === 'path_blocked'
                      ? 'bg-warning-amber/20 text-warning-amber border border-warning-amber/50'
                      : 'text-text-secondary hover:text-warning-amber'
                  )}
                >
                  堵塞 ({anomalyStats.pathBlocked})
                </button>
              </div>
            </div>
          </div>

          {filteredAnomalies.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredAnomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-all',
                    anomaly.isReviewed
                      ? 'bg-circuit-dark/30 border-circuit-border/50 opacity-60'
                      : 'bg-circuit-dark/50 border-circuit-border hover:border-power-blue/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded font-mono',
                      getAnomalyTypeColor(anomaly.type),
                      anomaly.type === 'short_circuit' ? 'bg-danger-red/20' : 'bg-warning-amber/20'
                    )}>
                      {getAnomalyTypeLabel(anomaly.type)}
                    </span>
                    <div>
                      <p className="text-sm text-text-primary">{anomaly.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-muted font-mono">
                          {formatTime(anomaly.timestamp)}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          来源: {anomaly.source === 'game' ? '游戏' : '导入'}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          影响: {anomaly.cellIds.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!anomaly.isReviewed && (
                    <button
                      onClick={() => markAsReviewed(anomaly.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-success-green hover:bg-success-green/10 rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      标记已复核
                    </button>
                  )}
                  {anomaly.isReviewed && (
                    <CheckCircle className="w-4 h-4 text-success-green" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-green" />
              <p className="font-mono">无异常事件</p>
            </div>
          )}
        </div>

        <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm mb-6">
          <button
            onClick={() => setShowChainSummary(!showChainSummary)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h3 className="font-display text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-power-blue" />
              电源节点到成绩导出完整链路
            </h3>
            {showChainSummary ? (
              <ChevronUp className="w-5 h-5 text-text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-text-muted" />
            )}
          </button>

          {showChainSummary && (
            <div className="bg-circuit-dark/50 rounded-lg p-4 border border-circuit-border">
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">
                {chainSummary}
              </pre>
              {fullChain && (
                <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                  <div className="bg-circuit-dark/50 rounded p-2">
                    <div className="text-power-blue font-display text-lg">{fullChain.powerNodeStates.length}</div>
                    <div className="text-xs text-text-muted font-mono">电源节点</div>
                  </div>
                  <div className="bg-circuit-dark/50 rounded p-2">
                    <div className="text-success-green font-display text-lg">{fullChain.circuitStates.length}</div>
                    <div className="text-xs text-text-muted font-mono">电路快照</div>
                  </div>
                  <div className="bg-circuit-dark/50 rounded p-2">
                    <div className="text-danger-red font-display text-lg">{fullChain.shortCircuitEvents.length}</div>
                    <div className="text-xs text-text-muted font-mono">短路事件</div>
                  </div>
                  <div className="bg-circuit-dark/50 rounded p-2">
                    <div className="text-warning-amber font-display text-lg">{fullChain.operationChain.length}</div>
                    <div className="text-xs text-text-muted font-mono">操作记录</div>
                  </div>
                  <div className="bg-circuit-dark/50 rounded p-2">
                    <div className="text-warning-amber font-display text-lg">{fullChain.anomalyEvents.length}</div>
                    <div className="text-xs text-text-muted font-mono">异常事件</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
          <h3 className="font-display text-lg mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-power-blue" />
            数据导出
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => handleExport('score', 'json')}
              className="flex flex-col items-center gap-2 p-4 bg-circuit-dark/50 rounded-xl border border-circuit-border hover:border-power-blue hover:bg-power-blue/5 transition-all group"
            >
              <FileJson className="w-8 h-8 text-power-blue group-hover:scale-110 transition-transform" />
              <span className="text-sm text-text-primary font-mono">成绩报告</span>
              <span className="text-xs text-text-muted">JSON</span>
            </button>

            <button
              onClick={() => handleExport('full_chain', 'csv')}
              className="flex flex-col items-center gap-2 p-4 bg-circuit-dark/50 rounded-xl border border-circuit-border hover:border-success-green hover:bg-success-green/5 transition-all group"
            >
              <FileSpreadsheet className="w-8 h-8 text-success-green group-hover:scale-110 transition-transform" />
              <span className="text-sm text-text-primary font-mono">完整链路</span>
              <span className="text-xs text-text-muted">CSV</span>
            </button>

            <button
              onClick={() => handleExport('operations', 'csv')}
              className="flex flex-col items-center gap-2 p-4 bg-circuit-dark/50 rounded-xl border border-circuit-border hover:border-warning-amber hover:bg-warning-amber/5 transition-all group"
            >
              <FileSpreadsheet className="w-8 h-8 text-warning-amber group-hover:scale-110 transition-transform" />
              <span className="text-sm text-text-primary font-mono">操作日志</span>
              <span className="text-xs text-text-muted">CSV</span>
            </button>

            <button
              onClick={() => handleExport('anomalies', 'csv')}
              className="flex flex-col items-center gap-2 p-4 bg-circuit-dark/50 rounded-xl border border-circuit-border hover:border-danger-red hover:bg-danger-red/5 transition-all group"
            >
              <FileSpreadsheet className="w-8 h-8 text-danger-red group-hover:scale-110 transition-transform" />
              <span className="text-sm text-text-primary font-mono">异常报告</span>
              <span className="text-xs text-text-muted">CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
