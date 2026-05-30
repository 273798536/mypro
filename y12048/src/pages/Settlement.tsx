import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  RotateCcw,
  Home,
  Play,
  Search,
  ArrowRight,
  UserCog,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getResultMessage, getScoreColor, getScoreRingColor } from '../utils/scoring';
import { cn } from '@/lib/utils';

export const Settlement: React.FC = () => {
  const navigate = useNavigate();
  const {
    position,
    score,
    maxScore,
    penalties,
    actionHistory,
    restartGame,
    reviseAction,
    selectedTraceId,
    selectTrace,
  } = useGameStore();

  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseActionId, setReviseActionId] = useState<string | null>(null);
  const [reviseBy, setReviseBy] = useState('');
  const [reviseNote, setReviseNote] = useState('');

  const survived = position.status !== 'liquidated';
  const result = getResultMessage(score, maxScore, survived);

  const handleRevise = (actionId: string) => {
    setReviseActionId(actionId);
    setShowReviseModal(true);
  };

  const submitRevise = () => {
    if (reviseActionId && reviseBy && reviseNote) {
      reviseAction(reviseActionId, reviseBy, reviseNote);
      setShowReviseModal(false);
      setReviseActionId(null);
      setReviseBy('');
      setReviseNote('');
    }
  };

  const getLevelIcon = () => {
    switch (result.level) {
      case 'master':
      case 'excellent':
        return <Trophy className="w-16 h-16 text-yellow-400" />;
      case 'pass':
        return <CheckCircle className="w-16 h-16 text-emerald-400" />;
      case 'liquidated':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-orange-400" />;
    }
  };

  const totalPenalty = penalties.reduce((sum, p) => sum + p.score, 0);
  const totalBonus = actionHistory.reduce((sum, a) => sum + Math.max(0, a.scoreChange), 0);

  const handleTraceFromPosition = () => {
    const firstAction = actionHistory[0];
    if (firstAction) {
      selectTrace(firstAction.id);
    }
  };

  const handleTraceToCollateral = () => {
    const lastAction = actionHistory[actionHistory.length - 1];
    if (lastAction) {
      selectTrace(lastAction.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-800 rounded-full mb-6">
            {getLevelIcon()}
          </div>
          <h1 className={cn(
            'text-4xl font-bold mb-3',
            result.level === 'liquidated' ? 'text-red-400' :
            result.level === 'master' ? 'text-yellow-400' :
            result.level === 'excellent' ? 'text-emerald-400' : 'text-white'
          )}>
            {result.title}
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">{result.message}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="col-span-1">
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={getScoreRingColor(Math.max(0, score), maxScore)}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.max(0, score) / maxScore)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                    style={{
                      filter: `drop-shadow(0 0 8px ${getScoreRingColor(Math.max(0, score), maxScore)}40)`,
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-3xl font-bold font-mono', getScoreColor(Math.max(0, score), maxScore))}>
                    {Math.max(0, score)}
                  </span>
                  <span className="text-xs text-slate-500">/ {maxScore}</span>
                </div>
              </div>
              <div className="text-sm text-slate-400">最终得分</div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
              <h3 className="text-lg font-bold text-white mb-4">结算明细</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">基础奖励</span>
                  <span className="text-emerald-400 font-mono">+{totalBonus}</span>
                </div>
                {penalties.map((penalty) => (
                  <div key={penalty.id} className="flex items-center justify-between py-2 border-b border-slate-800">
                    <div>
                      <span className="text-slate-300">第{penalty.round}回合 - {penalty.type}</span>
                      <p className="text-xs text-slate-500">{penalty.description}</p>
                    </div>
                    <span className="text-red-400 font-mono">{penalty.score}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3">
                  <span className="text-white font-medium">总计</span>
                  <span className={cn('text-xl font-bold font-mono', getScoreColor(Math.max(0, score), maxScore))}>
                    {Math.max(0, score)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">双向数据追溯</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Search className="w-4 h-4" />
              <span>点击操作记录查看详情</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
            <button
              onClick={handleTraceFromPosition}
              className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <span>借贷仓位</span>
              <span className="text-xs text-slate-500 font-mono">{position.id.slice(0, 8)}...</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-slate-600">→</span>
            <button
              onClick={() => navigate('/review')}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <span>最终结果</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-slate-600">→</span>
            <button
              onClick={handleTraceToCollateral}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <span>抵押物明细</span>
              <span className="text-xs text-slate-500 font-mono">
                {position.collateralAmount.toFixed(2)} {position.collateralType}
              </span>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {actionHistory.map((action) => (
              <div
                key={action.id}
                onClick={() => selectTrace(selectedTraceId === action.id ? null : action.id)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  selectedTraceId === action.id
                    ? 'bg-violet-500/10 border-violet-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono">R{action.round}</span>
                    <span className={cn(
                      'text-sm font-medium',
                      action.scoreChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {action.scoreChange >= 0 ? '+' : ''}{action.scoreChange} 分
                    </span>
                    <span className="text-sm text-slate-300">{action.explanation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.isRevised && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <UserCog className="w-3 h-3" />
                        已修订
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevise(action.id);
                      }}
                      className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-amber-400 transition-colors"
                      title="补录清算人信息"
                    >
                      <UserCog className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {selectedTraceId === action.id && (
                  <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">抵押率</span>
                      <div className="text-white font-mono">{action.positionSnapshot.currentRatio.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-slate-500">价格</span>
                      <div className="text-white font-mono">${action.priceSnapshot.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">抵押物</span>
                      <div className="text-white font-mono">{action.positionSnapshot.collateralAmount.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">借贷</span>
                      <div className="text-white font-mono">${action.positionSnapshot.borrowAmount.toFixed(0)}</div>
                    </div>
                    
                    {action.isRevised && action.revisionNote && (
                      <div className="col-span-4 mt-2 p-2 bg-amber-500/10 rounded border border-amber-500/30">
                        <div className="text-xs text-amber-400 mb-1">
                          修订人: {action.revisedBy} · {action.revisedAt && new Date(action.revisedAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-amber-200">{action.revisionNote}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
          <button
            onClick={() => navigate('/review')}
            className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            查看复盘
          </button>
          <button
            onClick={restartGame}
            className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            再来一局
          </button>
        </div>
      </div>

      {showReviseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowReviseModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">补录清算人信息</h3>
              <button
                onClick={() => setShowReviseModal(false)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">清算人名称</label>
                <input
                  type="text"
                  value={reviseBy}
                  onChange={(e) => setReviseBy(e.target.value)}
                  placeholder="输入清算人名称"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">修订说明</label>
                <textarea
                  value={reviseNote}
                  onChange={(e) => setReviseNote(e.target.value)}
                  placeholder="输入修订说明"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
              <button
                onClick={submitRevise}
                disabled={!reviseBy || !reviseNote}
                className="w-full py-3 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                保存修订
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
