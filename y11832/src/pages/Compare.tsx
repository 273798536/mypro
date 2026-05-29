import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GitCompare, TrendingUp, TrendingDown, Minus, Award, Users, AlertTriangle, Clock, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { compareResults, generateComparisonSummary } from '../engine/ChangeDetector';
import { getPenaltyCategoryLabel } from '../utils/penaltyUtils';
import { GameResult, ResultComparison } from '../types';

const gradeConfig = {
  S: { color: 'text-metro-yellow', bg: 'bg-metro-yellow/20' },
  A: { color: 'text-metro-green', bg: 'bg-metro-green/20' },
  B: { color: 'text-metro-blue', bg: 'bg-metro-blue/20' },
  C: { color: 'text-metro-orange', bg: 'bg-metro-orange/20' },
  D: { color: 'text-metro-red', bg: 'bg-metro-red/20' },
  F: { color: 'text-metro-red', bg: 'bg-metro-red/20' },
};

export default function Compare() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const results = useGameStore((state) => state.results);
  const [oldResultId, setOldResultId] = useState<string>('');
  const [newResultId, setNewResultId] = useState<string>(searchParams.get('resultId') || '');

  const comparison = useMemo((): ResultComparison | null => {
    if (!oldResultId || !newResultId) return null;
    const oldResult = results.find((r) => r.id === oldResultId);
    const newResult = results.find((r) => r.id === newResultId);
    if (!oldResult || !newResult) return null;
    return compareResults(oldResult, newResult);
  }, [oldResultId, newResultId, results]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => b.createdAt - a.createdAt);
  }, [results]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getResultLabel = (result: GameResult) => {
    return `${formatDate(result.createdAt)} - ${result.grade}级 - ${result.totalScore}分`;
  };

  if (results.length < 2) {
    return (
      <div className="min-h-screen bg-metro-bg text-metro-text">
        <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

        <header className="relative border-b border-metro-border bg-metro-bgDark/80 backdrop-blur">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">返回首页</span>
              </button>
              <div>
                <h1 className="text-xl font-bold">结果对比</h1>
                <p className="text-xs text-metro-textMuted">选择两次训练结果进行对比分析</p>
              </div>
            </div>
          </div>
        </header>

        <main className="relative container mx-auto px-6 py-16 text-center">
          <AlertTriangle className="mx-auto text-metro-yellow mb-4" size={64} />
          <h2 className="text-2xl font-bold mb-2">训练记录不足</h2>
          <p className="text-metro-textMuted mb-6">至少需要完成 2 次训练才能进行结果对比</p>
          <p className="text-sm text-metro-textMuted">当前已完成 {results.length} 次训练</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-metro-blue hover:bg-blue-600 text-white rounded-lg font-bold transition-all"
          >
            开始训练
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-metro-bg text-metro-text">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <header className="relative border-b border-metro-border bg-metro-bgDark/80 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">返回首页</span>
              </button>
              <div>
                <h1 className="text-xl font-bold">结果对比</h1>
                <p className="text-xs text-metro-textMuted">选择两次训练结果进行对比分析</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="metro-panel">
            <label className="block text-sm text-metro-textMuted mb-2">旧结果（修改前）</label>
            <select
              value={oldResultId}
              onChange={(e) => setOldResultId(e.target.value)}
              className="w-full px-3 py-3 bg-metro-bg border border-metro-border rounded-lg text-metro-text"
            >
              <option value="">请选择旧结果</option>
              {sortedResults.map((result) => (
                <option key={result.id} value={result.id} disabled={result.id === newResultId}>
                  {getResultLabel(result)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <div className="p-4 bg-metro-blue/20 rounded-full">
              <GitCompare className="text-metro-blue" size={32} />
            </div>
          </div>

          <div className="metro-panel">
            <label className="block text-sm text-metro-textMuted mb-2">新结果（修改后）</label>
            <select
              value={newResultId}
              onChange={(e) => setNewResultId(e.target.value)}
              className="w-full px-3 py-3 bg-metro-bg border border-metro-border rounded-lg text-metro-text"
            >
              <option value="">请选择新结果</option>
              {sortedResults.map((result) => (
                <option key={result.id} value={result.id} disabled={result.id === oldResultId}>
                  {getResultLabel(result)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {comparison && (
          <>
            <div className="metro-panel mb-8">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-metro-yellow" size={24} />
                <div>
                  <h3 className="font-bold text-lg">对比摘要</h3>
                  <p className="text-sm text-metro-textMuted">{generateComparisonSummary(comparison)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <ResultCard title="旧结果" result={comparison.oldResult} label="修改前" />
              <ResultCard title="新结果" result={comparison.newResult} label="修改后" />
            </div>

            <div className="metro-panel">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <GitCompare className="text-metro-blue" size={20} />
                详细差异
              </h3>

              <div className="space-y-3">
                {comparison.differences.length === 0 ? (
                  <div className="text-center py-8 text-metro-textMuted">
                    <CheckCircle className="mx-auto mb-2 text-metro-green" size={32} />
                    <p>两次结果没有显著差异</p>
                  </div>
                ) : (
                  comparison.differences.map((diff, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-metro-bg rounded-lg border border-metro-border hover:border-metro-blue/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {diff.impact === 'positive' ? (
                          <TrendingUp className="text-metro-green" size={20} />
                        ) : diff.impact === 'negative' ? (
                          <TrendingDown className="text-metro-red" size={20} />
                        ) : (
                          <Minus className="text-metro-textMuted" size={20} />
                        )}
                        <div>
                          <span className="font-bold">{diff.category}</span>
                          <span className="text-xs text-metro-textMuted ml-2">({diff.field})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-metro-textMuted font-mono">{String(diff.oldValue)}</span>
                        <ArrowRight className="text-metro-textMuted" size={16} />
                        <span
                          className={`font-mono font-bold ${
                            diff.impact === 'positive'
                              ? 'text-metro-green'
                              : diff.impact === 'negative'
                              ? 'text-metro-red'
                              : 'text-metro-text'
                          }`}
                        >
                          {String(diff.newValue)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            diff.impact === 'positive'
                              ? 'bg-metro-green/20 text-metro-green'
                              : diff.impact === 'negative'
                              ? 'bg-metro-red/20 text-metro-red'
                              : 'bg-metro-textMuted/20 text-metro-textMuted'
                          }`}
                        >
                          {diff.change === 'increase' ? '↑ 上升' : diff.change === 'decrease' ? '↓ 下降' : '变更'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <PenaltyComparisonCard
                title="旧结果 - 扣分统计"
                penalties={comparison.oldResult.penalties}
                totalScore={comparison.oldResult.totalScore}
              />
              <PenaltyComparisonCard
                title="新结果 - 扣分统计"
                penalties={comparison.newResult.penalties}
                totalScore={comparison.newResult.totalScore}
              />
            </div>
          </>
        )}

        {!comparison && oldResultId && newResultId && (
          <div className="metro-panel text-center py-12">
            <XCircle className="mx-auto text-metro-red mb-4" size={48} />
            <p className="text-metro-textMuted">无法加载对比数据，请重新选择结果</p>
          </div>
        )}

        {!comparison && (!oldResultId || !newResultId) && (
          <div className="metro-panel text-center py-12">
            <GitCompare className="mx-auto text-metro-textMuted mb-4" size={48} />
            <p className="text-metro-textMuted">请从上方选择两个训练结果进行对比</p>
          </div>
        )}
      </main>
    </div>
  );
}

interface ResultCardProps {
  title: string;
  result: GameResult;
  label: string;
}

function ResultCard({ title, result, label }: ResultCardProps) {
  const grade = gradeConfig[result.grade];
  const totalPenalty = result.penalties.reduce((sum, p) => sum + p.penaltyPoints, 0);

  return (
    <div className="metro-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <span className="text-xs px-2 py-1 bg-metro-bgLight rounded text-metro-textMuted">{label}</span>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className={`w-20 h-20 rounded-full ${grade.bg} flex items-center justify-center`}>
          <span className={`text-4xl font-bold ${grade.color}`}>{result.grade}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <Award className="text-metro-yellow" size={20} />
            <span className="text-3xl font-bold text-metro-yellow font-mono">{result.totalScore}</span>
            <span className="text-sm text-metro-textMuted">/ {result.maxPossibleScore}</span>
          </div>
          <p className="text-xs text-metro-textMuted">
            完成时间：{new Date(result.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-metro-bg rounded text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="text-metro-green" size={14} />
            <span className="text-xs text-metro-textMuted">疏散率</span>
          </div>
          <div className="text-xl font-bold text-metro-green font-mono">
            {result.simulationSummary.totalPassengers > 0
              ? Math.round((result.simulationSummary.evacuatedPassengers / result.simulationSummary.totalPassengers) * 100)
              : 0}%
          </div>
          <div className="text-xs text-metro-textMuted">
            {result.simulationSummary.evacuatedPassengers}/{result.simulationSummary.totalPassengers} 人
          </div>
        </div>

        <div className="p-3 bg-metro-bg rounded text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="text-metro-orange" size={14} />
            <span className="text-xs text-metro-textMuted">最大拥堵</span>
          </div>
          <div className="text-xl font-bold text-metro-orange font-mono">
            {Math.round(result.simulationSummary.maxCongestionLevel * 100)}%
          </div>
          <div className="text-xs text-metro-textMuted">
            平均 {result.simulationSummary.avgEvacuationTime.toFixed(0)}s
          </div>
        </div>

        <div className="p-3 bg-metro-bg rounded text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="text-metro-blue" size={14} />
            <span className="text-xs text-metro-textMuted">违规次数</span>
          </div>
          <div className="text-xl font-bold text-metro-blue font-mono">{result.penalties.length}</div>
        </div>

        <div className="p-3 bg-metro-bg rounded text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="text-metro-red" size={14} />
            <span className="text-xs text-metro-textMuted">累计扣分</span>
          </div>
          <div className="text-xl font-bold text-metro-red font-mono">-{totalPenalty}</div>
        </div>
      </div>
    </div>
  );
}

interface PenaltyComparisonCardProps {
  title: string;
  penalties: GameResult['penalties'];
  totalScore: number;
}

function PenaltyComparisonCard({ title, penalties }: PenaltyComparisonCardProps) {
  const categories = ['congestion', 'missed_broadcast', 'wrong_diversion', 'safety_risk', 'cooldown_violation'] as const;

  const categoryStats = categories.map((cat) => {
    const catPenalties = penalties.filter((p) => p.category === cat);
    return {
      category: cat,
      count: catPenalties.length,
      points: catPenalties.reduce((sum, p) => sum + p.penaltyPoints, 0),
    };
  });

  const totalPoints = penalties.reduce((sum, p) => sum + p.penaltyPoints, 0);

  return (
    <div className="metro-panel">
      <h3 className="font-bold mb-4">{title}</h3>
      
      <div className="space-y-4">
        {categoryStats.map((stat) => (
          <div key={stat.category}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{getPenaltyCategoryLabel(stat.category)}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-metro-textMuted">{stat.count} 次</span>
                <span className="text-sm font-bold text-metro-red font-mono">-{stat.points}</span>
              </div>
            </div>
            <div className="h-2 bg-metro-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-metro-red transition-all"
                style={{ width: `${totalPoints > 0 ? (stat.points / totalPoints) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-metro-border flex justify-between">
          <span className="font-bold">总计</span>
          <span className="font-bold text-metro-red font-mono">-{totalPoints} 分</span>
        </div>
      </div>
    </div>
  );
}
