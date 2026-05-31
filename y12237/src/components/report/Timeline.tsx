import React from 'react';
import { motion } from 'framer-motion';
import { OperationLog, PenaltyEvent, RewardEvent } from '../../game/types';
import { Coins, Unlock, PlayCircle, AlertTriangle, TrendingUp, Trophy } from 'lucide-react';

interface TimelineProps {
  logs: OperationLog[];
  penalties: PenaltyEvent[];
  rewards: RewardEvent[];
}

const getLogIcon = (type: OperationLog['type']) => {
  switch (type) {
    case 'stake':
      return Coins;
    case 'unlock':
      return Unlock;
    case 'round_advance':
      return PlayCircle;
    case 'penalty':
      return AlertTriangle;
    case 'reward':
      return TrendingUp;
    case 'game_start':
    case 'game_end':
      return Trophy;
    default:
      return Coins;
  }
};

const getLogColor = (type: OperationLog['type']) => {
  switch (type) {
    case 'stake':
      return 'bg-cyan-500';
    case 'unlock':
      return 'bg-purple-500';
    case 'round_advance':
      return 'bg-green-500';
    case 'penalty':
      return 'bg-red-500';
    case 'reward':
      return 'bg-emerald-500';
    case 'game_start':
    case 'game_end':
      return 'bg-yellow-500';
    default:
      return 'bg-slate-500';
  }
};

export const Timeline: React.FC<TimelineProps> = ({ logs }) => {
  const groupedLogs = logs.reduce((acc, log) => {
    const round = log.round;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(log);
    return acc;
  }, {} as Record<number, OperationLog[]>);

  const rounds = Object.keys(groupedLogs)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <PlayCircle size={24} className="text-cyan-400" />
        事件时间线
      </h3>
      
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />
        
        <div className="space-y-6">
          {rounds.map((round, roundIndex) => (
            <motion.div
              key={round}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: roundIndex * 0.1 }}
              className="relative pl-12"
            >
              <div
                className={`absolute left-2 top-1 w-5 h-5 rounded-full ${getLogColor(
                  groupedLogs[round][0]?.type || 'round_advance'
                )} ring-4 ring-slate-800`}
              />
              
              <div className="mb-2">
                <span className="text-cyan-400 font-bold text-sm">第 {round} 回合</span>
              </div>
              
              <div className="space-y-2">
                {groupedLogs[round].map((log, logIndex) => {
                  const Icon = getLogIcon(log.type);
                  const colorClass = getLogColor(log.type);
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roundIndex * 0.1 + logIndex * 0.05 }}
                      className={`flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 ${
                        log.type === 'penalty'
                          ? 'border border-red-500/30'
                          : log.type === 'reward'
                          ? 'border border-green-500/30'
                          : ''
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${colorClass}/20`}
                      >
                        <Icon
                          size={16}
                          className={colorClass.replace('bg-', 'text-')}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            log.type === 'penalty'
                              ? 'text-red-400'
                              : log.type === 'reward'
                              ? 'text-green-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {log.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
