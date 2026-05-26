import React from 'react';
import { motion } from 'framer-motion';
import type { FlightRecord } from '../types/game';
import { getGradeFromScore } from '../utils/scoring';
import { exportToJSON } from '../utils/export';

interface ResultPanelProps {
  success: boolean;
  score: number;
  failureReason?: string;
  record?: FlightRecord;
  onReplay: () => void;
  onClose: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  success,
  score,
  failureReason,
  record,
  onReplay,
  onClose,
}) => {
  const grade = getGradeFromScore(score);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-slate-900/95 rounded-2xl p-6 max-w-md w-full mx-4 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-4"
          >
            {success ? '🚀' : '💥'}
          </motion.div>
          
          <h2 className={`text-2xl font-bold mb-2 ${
            success ? 'text-green-400' : 'text-red-400'
          }`}>
            {success ? '着陆成功！' : '任务失败'}
          </h2>

          {success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative inline-block"
            >
              <span 
                className="text-7xl font-black"
                style={{ 
                  color: grade.color,
                  textShadow: `0 0 30px ${grade.color}40, 0 0 60px ${grade.color}20`
                }}
              >
                {grade.grade}
              </span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4"
          >
            <div className="text-gray-400 text-sm">最终得分</div>
            <div className="text-4xl font-black text-white font-mono">
              {score.toLocaleString()}
            </div>
          </motion.div>
        </div>

        {failureReason && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4"
          >
            <div className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
              <span>⚠️</span> 失败原因
            </div>
            <div className="text-red-300 text-sm space-y-1">
              {failureReason.split('; ').map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {record && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/50 rounded-lg p-4 mb-6"
          >
            <div className="text-cyan-400 font-bold text-sm mb-3 flex items-center gap-2">
              <span>📊</span> 飞行统计
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-400">飞行时间</div>
                <div className="text-white font-mono">
                  {record.summary.flightTime.toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-gray-400">最大高度</div>
                <div className="text-white font-mono">
                  {record.summary.maxAltitude.toFixed(0)}m
                </div>
              </div>
              <div>
                <div className="text-gray-400">燃料使用</div>
                <div className="text-white font-mono">
                  {record.summary.fuelUsed.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-gray-400">着陆精度</div>
                <div className="text-white font-mono">
                  {record.summary.landingAccuracy.toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-gray-400">最大速度</div>
                <div className="text-white font-mono">
                  {record.summary.maxVelocity.toFixed(1)}m/s
                </div>
              </div>
              <div>
                <div className="text-gray-400">撞击速度</div>
                <div className="text-white font-mono">
                  {record.summary.impactSpeed.toFixed(1)}m/s
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3"
        >
          {record && (
            <button
              onClick={onReplay}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500
                         hover:from-cyan-400 hover:to-blue-400
                         text-white font-bold py-3 px-4 rounded-lg
                         transition-all flex items-center justify-center gap-2"
            >
              <span>🎬</span> 慢动作回放
            </button>
          )}
          <button
            onClick={() => record && exportToJSON(record)}
            className="bg-gradient-to-r from-slate-600 to-slate-700
                       hover:from-slate-500 hover:to-slate-600
                       text-white font-bold py-3 px-4 rounded-lg
                       transition-all flex items-center justify-center gap-2"
          >
            <span>📥</span> 导出
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
