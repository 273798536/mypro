import { useState } from 'react';
import { motion } from 'framer-motion';
import { List, AlertTriangle, CheckCircle } from 'lucide-react';
import NormalList from './NormalList';
import AnomalyList from './AnomalyList';
import {
  useOperations,
  useAnomalies,
  useScore,
  useGameStatus,
} from '../../store/useGameStore';

type TabType = 'normal' | 'anomaly';

export default function RecordsPanel() {
  const operations = useOperations();
  const anomalies = useAnomalies();
  const score = useScore();
  const status = useGameStatus();
  const [activeTab, setActiveTab] = useState<TabType>('normal');
  const [highlightedOpId, setHighlightedOpId] = useState<string | null>(null);

  const unresolvedAnomalies = anomalies.filter(
    a => !a.resolved && a.type !== 'invalid_connection'
  ).length;

  const tabs = [
    {
      id: 'normal' as TabType,
      label: '正常明细',
      icon: List,
      count: operations.length,
      color: 'text-slate-400',
      activeColor: 'text-blue-400',
      borderColor: 'border-blue-500',
    },
    {
      id: 'anomaly' as TabType,
      label: '异常清单',
      icon: AlertTriangle,
      count: unresolvedAnomalies,
      color: 'text-slate-400',
      activeColor: 'text-red-400',
      borderColor: 'border-red-500',
    },
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-slate-200">操作记录</h2>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-slate-500">得分</p>
            <p className="font-display font-bold text-amber-400">{score}</p>
          </div>
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'playing'
                ? 'bg-green-500 animate-pulse'
                : status === 'won'
                ? 'bg-cyan-500'
                : 'bg-red-500'
            }`}
          />
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-slate-900/50 p-1 rounded-lg">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? `bg-slate-800 ${tab.activeColor} border-b-2 ${tab.borderColor}`
                  : `${tab.color} hover:text-slate-300`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    tab.id === 'anomaly'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {activeTab === 'anomaly' && unresolvedAnomalies > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">
              检测到 {unresolvedAnomalies} 个待处理异常，请及时修复！
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {activeTab === 'normal' ? (
          <NormalList
            operations={operations}
            onOperationHover={setHighlightedOpId}
            highlightedOpId={highlightedOpId}
          />
        ) : (
          <AnomalyList anomalies={anomalies} />
        )}
      </div>

      {operations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span>已完成 {operations.length} 步操作</span>
            </div>
            <div className="text-slate-500">
              {status === 'playing' && '游戏进行中'}
              {status === 'won' && '任务完成'}
              {status === 'lost' && '任务失败'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
