import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Coins,
  Shield,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { SyncProgressBar } from '@/components/SyncProgressBar';
import type { Penalty, ConclusionDiff } from '@/types';

const PenaltyItem = ({ penalty }: { penalty: Penalty }) => {
  const [expanded, setExpanded] = useState(false);

  const getTypeLabel = () => {
    switch (penalty.type) {
      case 'offline':
        return '离线惩罚';
      case 'sync_violation':
        return '同步违规';
      case 'duplicate_stake':
        return '重复质押';
      default:
        return '未知惩罚';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border rounded-lg overflow-hidden ${
        penalty.isMissed
          ? 'border-red-500/50 bg-red-500/5'
          : 'border-slate-700 bg-slate-800/30'
      }`}
    >
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {penalty.isMissed ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{getTypeLabel()}</span>
              <span className="text-xs text-slate-400">回合 {penalty.round}</span>
              {penalty.isMissed && (
                <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                  运营失误
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{penalty.nodeName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-red-400 font-mono font-bold">-{penalty.amount}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
          <p className="text-sm text-slate-300 mt-3">
            <span className="text-slate-500">原因：</span>
            {penalty.reason}
          </p>
        </div>
      )}
    </motion.div>
  );
};

const DiffItem = ({ diff }: { diff: ConclusionDiff }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${
        diff.isCritical
          ? 'border-red-500/50 bg-red-500/5'
          : 'border-amber-500/30 bg-amber-500/5'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`font-medium ${diff.isCritical ? 'text-red-400' : 'text-amber-400'}`}>
          {diff.field}
        </span>
        {diff.isCritical && (
          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
            关键变更
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-500 text-xs block mb-1">原记录</span>
          <span className="text-red-400 line-through">{diff.oldValue}</span>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">补录后</span>
          <span className="text-emerald-400">{diff.newValue}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <span className="text-slate-400 text-xs">结论变动：</span>
        <span className="text-cyan-400 text-sm ml-1">{diff.conclusionChange}</span>
      </div>
    </motion.div>
  );
};

const SupplementForm = ({ nodeId, nodeName, currentSync }: { nodeId: string; nodeName: string; currentSync: number }) => {
  const [value, setValue] = useState('');
  const { supplementSyncData, supplementData } = useGameStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      supplementSyncData(nodeId, numValue);
    }
  };

  const existingValue = supplementData[nodeId];

  return (
    <div className="p-3 bg-slate-800/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-300">{nodeName}</span>
        <span className="text-xs text-slate-500">原记录: {currentSync}%</span>
      </div>
      {existingValue !== undefined ? (
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-sm">已补录: {existingValue}%</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="number"
            min="0"
            max="100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="输入实际同步进度 %"
            className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-500 transition-colors"
          >
            补录
          </button>
        </form>
      )}
    </div>
  );
};

export const SettlementPage = () => {
  const {
    nodes,
    totalScore,
    totalPenalties,
    penalties,
    decisions,
    eventLogs,
    conclusionDiffs,
    restartGame,
    maxRounds,
    currentRound,
    isGameOver,
  } = useGameStore();

  const activeTab = 'overview';
  const aliveNodes = nodes.filter((n) => n.isOnline && n.healthScore > 30).length;
  const avgSync = Math.round(nodes.reduce((sum, n) => sum + n.syncProgress, 0) / nodes.length);
  const avgHealth = Math.round(nodes.reduce((sum, n) => sum + n.healthScore, 0) / nodes.length);

  const getScoreGrade = () => {
    if (totalScore >= 800) return { grade: 'S', color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
    if (totalScore >= 600) return { grade: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (totalScore >= 400) return { grade: 'B', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    if (totalScore >= 200) return { grade: 'C', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { grade: 'D', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const scoreGrade = getScoreGrade();

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回游戏
          </Link>
          <button
            onClick={restartGame}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重新开始
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-white mb-2 font-['Orbitron']">
            {isGameOver ? '🏁 战役结算' : '📊 实时战报'}
          </h1>
          <p className="text-slate-400">
            回合 {currentRound}/{maxRounds} · 共 {decisions.length} 次决策 · {penalties.length} 次惩罚
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 mb-8"
        >
          <div className="flex items-center justify-center gap-12 mb-8">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${scoreGrade.bg} mb-3`}>
                <Trophy className={`w-12 h-12 ${scoreGrade.color}`} />
              </div>
              <div className="text-5xl font-bold text-white font-['Orbitron'] mb-1">
                {totalScore}
              </div>
              <div className={`text-sm font-medium ${scoreGrade.color}`}>
                评级 {scoreGrade.grade}
              </div>
            </div>

            <div className="h-32 w-px bg-slate-700" />

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                  <Wifi className="w-4 h-4" />
                  存活节点
                </div>
                <div className="text-3xl font-bold text-emerald-400 font-mono">
                  {aliveNodes}/{nodes.length}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                  <Coins className="w-4 h-4" />
                  惩罚总额
                </div>
                <div className="text-3xl font-bold text-red-400 font-mono">
                  {totalPenalties}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                  <Shield className="w-4 h-4" />
                  平均健康分
                </div>
                <div className="text-3xl font-bold text-cyan-400 font-mono">
                  {avgHealth}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                  <Clock className="w-4 h-4" />
                  平均同步
                </div>
                <div className="text-3xl font-bold text-amber-400 font-mono">
                  {avgSync}%
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {nodes.map((node) => (
              <div key={node.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white">{node.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${node.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {node.isOnline ? '在线' : '离线'}
                  </span>
                </div>
                <SyncProgressBar progress={node.syncProgress} size="sm" />
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-slate-400">健康分</span>
                  <span className={`font-mono ${node.healthScore >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {node.healthScore}
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-sm">
                  <span className="text-slate-400">质押量</span>
                  <span className="font-mono text-yellow-400">{node.stakeAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-['Orbitron']">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              惩罚记录
              <span className="text-sm font-normal text-slate-400">({penalties.length})</span>
            </h2>

            {penalties.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无惩罚记录，干得漂亮！</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {penalties.map((penalty) => (
                  <PenaltyItem key={penalty.id} penalty={penalty} />
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-['Orbitron']">
              <Target className="w-5 h-5 text-cyan-400" />
              决策记录
              <span className="text-sm font-normal text-slate-400">({decisions.length})</span>
            </h2>

            {decisions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无决策记录</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {decisions.map((decision, idx) => (
                  <motion.div
                    key={decision.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                        回合 {decision.round}
                      </span>
                      <span className="text-xs text-slate-500">#{idx + 1}</span>
                    </div>
                    <p className="text-sm text-white">{decision.description}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-['Orbitron']">
            <Edit3 className="w-5 h-5 text-amber-400" />
            同步进度补录与结论改动追踪
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            补录实际同步进度数据，系统将自动对比并标记结论变动。这是社区运营复盘的关键步骤。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {nodes.map((node) => (
              <SupplementForm
                key={node.id}
                nodeId={node.id}
                nodeName={node.name}
                currentSync={node.syncProgress}
              />
            ))}
          </div>

          {conclusionDiffs.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-400" />
                检测到 {conclusionDiffs.length} 处结论变动
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conclusionDiffs.map((diff, idx) => (
                  <DiffItem key={`${diff.field}-${idx}`} diff={diff} />
                ))}
              </div>
            </div>
          )}

          {Object.keys(useGameStore.getState().supplementData).length > 0 && conclusionDiffs.length === 0 && (
            <div className="text-center py-6 text-emerald-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p>补录数据与游戏记录一致，无结论变动</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-['Orbitron']">
            <FileText className="w-5 h-5 text-purple-400" />
            完整战报
          </h2>
          <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
            {eventLogs.slice(-30).map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm p-2 hover:bg-slate-700/30 rounded">
                <span className="text-slate-500 font-mono text-xs whitespace-nowrap">
                  R{log.round}
                </span>
                <span className={`${
                  log.severity === 'error' ? 'text-red-400' :
                  log.severity === 'warning' ? 'text-amber-400' :
                  'text-slate-300'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
