import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bug,
  AlertOctagon,
  XCircle,
  Clock,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { NodeCard } from '@/components/NodeCard';
import { badNodeExample } from '@/data/gameData';
import type { Penalty, PendingItem, EventLog } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const demoPenalties: Penalty[] = [
  {
    id: generateId(),
    nodeId: 'node-bad-001',
    nodeName: '故障演示节点',
    round: 3,
    type: 'offline',
    amount: 100,
    reason: '节点连续离线2回合',
    isMissed: false,
  },
  {
    id: generateId(),
    nodeId: 'node-bad-001',
    nodeName: '故障演示节点',
    round: 4,
    type: 'sync_violation',
    amount: 20,
    reason: '同步进度<50%持续3回合',
    isMissed: false,
  },
  {
    id: generateId(),
    nodeId: 'node-bad-001',
    nodeName: '故障演示节点',
    round: 5,
    type: 'offline',
    amount: 90,
    reason: '节点连续离线4回合',
    isMissed: false,
  },
  {
    id: generateId(),
    nodeId: 'node-bad-001',
    nodeName: '故障演示节点',
    round: 6,
    type: 'duplicate_stake',
    amount: 121,
    reason: '检测到重复质押标记',
    isMissed: false,
  },
  {
    id: generateId(),
    nodeId: 'node-bad-001',
    nodeName: '故障演示节点',
    round: 7,
    type: 'sync_violation',
    amount: 50,
    reason: '待确认事项超过3回合未处理 - 同步进度仅0%，严重落后',
    isMissed: true,
  },
];

const demoPendingItems: PendingItem[] = [
  {
    id: generateId(),
    nodeId: 'node-bad-001',
    nodeName: '故障演示节点',
    type: 'duplicate_stake',
    description: '检测到重复质押，需要立即处理',
    roundsPending: 4,
    isResolved: false,
  },
  {
    id: generateId(),
    nodeId: 'node-bad-001',
    nodeName: '故障演示节点',
    type: 'sync_lag',
    description: '同步进度仅0%，严重落后',
    roundsPending: 5,
    isResolved: false,
  },
];

const demoLogs: EventLog[] = [
  {
    id: generateId(),
    round: 1,
    type: 'system',
    message: '🚀 游戏开始',
    severity: 'info',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 2,
    type: 'network',
    message: '🌐 硬件故障警报',
    severity: 'error',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 2,
    type: 'system',
    message: '📍 故障演示节点 离线',
    severity: 'error',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 3,
    type: 'penalty',
    message: '⚠️ 故障演示节点 因离线被惩罚 100 质押量',
    severity: 'error',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 3,
    type: 'network',
    message: '🌐 检测到异常质押操作',
    severity: 'error',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 4,
    type: 'penalty',
    message: '⚠️ 故障演示节点 因同步落后被惩罚 20 健康分',
    severity: 'error',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 5,
    type: 'penalty',
    message: '⚠️ 故障演示节点 因离线被惩罚 90 质押量',
    severity: 'error',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 6,
    type: 'penalty',
    message: '⚠️ 故障演示节点 因重复质押被惩罚 121 质押量',
    severity: 'error',
    timestamp: new Date(),
  },
  {
    id: generateId(),
    round: 7,
    type: 'penalty',
    message: '❌ 运营失误：故障演示节点 的待确认事项超时未处理，追加惩罚',
    severity: 'error',
    timestamp: new Date(),
  },
];

const anomalyItems = [
  {
    icon: WifiOff,
    title: '持续离线',
    description: '节点连续5回合处于离线状态，未被及时发现和处理',
    consequence: '每2回合触发一次离线惩罚，累计扣除190质押量',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  {
    icon: Clock,
    title: '同步完全停滞',
    description: '同步进度0%，持续8回合未进行任何同步操作',
    consequence: '触发同步违规惩罚，健康分扣除20点，运营失误追加50点',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  {
    icon: AlertOctagon,
    title: '重复质押',
    description: '检测到重复质押标记，未在待确认区及时处理',
    consequence: '一次性扣除15%质押量（121），且持续产生待确认事项',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    icon: XCircle,
    title: '运营失误',
    description: '待确认事项超过3回合未处理，被系统标记为运营失误',
    consequence: '追加惩罚50点，且在战报中永久标记为失误记录',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  {
    icon: AlertTriangle,
    title: '健康分崩溃',
    description: '健康分从初始85分暴跌至15分，低于30分阈值',
    consequence: '节点被判定为"故障状态"，无法参与正常出块',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
];

export const BadNodeDemo = () => {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden pb-20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
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
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <Bug className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">异常路径演示</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-white mb-3 font-['Orbitron'] flex items-center justify-center gap-3">
            <Bug className="w-10 h-10 text-red-400" />
            故障节点完整演示
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            这是一个<span className="text-red-400 font-medium">故意设计的"坏掉"的验证节点</span>，
            同时展示多种异常状态。社区运营无需读代码，通过此页面即可直观确认所有异常路径是否生效。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <NodeCard node={badNodeExample} isHighlighted showBadState />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-amber-500/30 p-6"
          >
            <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2 font-['Orbitron']">
              <AlertTriangle className="w-5 h-5" />
              待确认区（故意未处理）
            </h2>
            <div className="space-y-3">
              {demoPendingItems.map((item) => (
                <motion.div
                  key={item.id}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`p-4 rounded-lg border ${
                    item.roundsPending >= 3
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-amber-500 bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {item.type === 'duplicate_stake' ? (
                        <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-400 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            item.type === 'duplicate_stake'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {item.type === 'duplicate_stake' ? '重复质押' : '同步落后'}
                          </span>
                          <span className="text-xs text-slate-400">{item.nodeName}</span>
                        </div>
                        <p className="text-sm text-slate-300">{item.description}</p>
                        <p className="text-xs mt-2 text-red-400">
                          ⚠️ 已等待 {item.roundsPending} 回合 - 已触发运营失误惩罚！
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-['Orbitron']">
            <AlertOctagon className="w-6 h-6 text-red-400" />
            异常状态逐项说明
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anomalyItems.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + idx * 0.1 }}
                className={`${item.bg} border ${item.border} rounded-xl p-5`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <h3 className={`font-bold ${item.color}`}>{item.title}</h3>
                </div>
                <p className="text-sm text-slate-300 mb-3">{item.description}</p>
                <div className="flex items-start gap-2 text-xs">
                  <ChevronRight className={`w-4 h-4 ${item.color} mt-0.5 flex-shrink-0`} />
                  <span className="text-slate-400">后果：{item.consequence}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-['Orbitron']">
              <XCircle className="w-5 h-5 text-red-400" />
              惩罚记录时间线
            </h2>
            <div className="space-y-4">
              {demoPenalties.map((penalty, idx) => (
                <motion.div
                  key={penalty.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.08 }}
                  className="relative pl-8"
                >
                  {idx < demoPenalties.length - 1 && (
                    <div className="absolute left-3 top-8 w-0.5 h-full bg-slate-700" />
                  )}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                    penalty.isMissed ? 'bg-red-500' : 'bg-amber-500'
                  }`}>
                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    penalty.isMissed
                      ? 'border-red-500/50 bg-red-500/5'
                      : 'border-slate-700 bg-slate-900/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">
                        {penalty.type === 'offline' ? '离线惩罚' :
                         penalty.type === 'sync_violation' ? '同步违规' : '重复质押'}
                      </span>
                      <span className="text-xs text-slate-400">回合 {penalty.round}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{penalty.reason}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-mono font-bold">-{penalty.amount}</span>
                      {penalty.isMissed && (
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                          运营失误
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                <span className="font-bold">累计惩罚：</span>
                {demoPenalties.reduce((sum, p) => sum + p.amount, 0)} 点
              </p>
              <p className="text-xs text-red-400 mt-1">
                其中运营失误导致：50 点（占比{Math.round(50 / demoPenalties.reduce((sum, p) => sum + p.amount, 0) * 100)}%）
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-['Orbitron']">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              事件日志（完整路径）
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {demoLogs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + idx * 0.05 }}
                  className={`p-3 rounded-lg border font-mono text-xs ${
                    log.severity === 'error'
                      ? 'text-red-400 bg-red-500/10 border-red-500/20'
                      : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      R{log.round}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">
                      {log.type === 'system' ? '系统' : log.type === 'network' ? '网络' : '惩罚'}
                    </span>
                  </div>
                  <p>{log.message}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10 p-6 bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-emerald-500/30 rounded-xl"
        >
          <h2 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2 font-['Orbitron']">
            <CheckCircle className="w-5 h-5" />
            ✅ 异常路径验证清单
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              '离线惩罚机制正常触发（连续离线≥2回合）',
              '同步违规惩罚正常触发（同步<50%≥3回合）',
              '重复质押惩罚正常触发（检测到标记即惩罚）',
              '待确认区正确显示重复质押和同步落后',
              '待确认事项超时（≥3回合）标记为运营失误',
              '运营失误触发额外惩罚',
              '事件日志完整记录所有操作',
              '惩罚记录时间线正确展示因果关系',
              '同步进度补录功能可检测结论变动',
              '结算页面正确统计惩罚总额和运营失误',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
