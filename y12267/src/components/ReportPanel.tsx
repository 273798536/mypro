import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, AlertCircle, ArrowLeftRight, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { GameReport, Violation } from '../types/game';
import { getPreviousMinecartReport, loadGameHistory } from '../utils/storage';
import { VIOLATION_RULES } from '../data/gameConfig';

const getViolationIcon = (type: string) => {
  const icons: Record<string, string> = {
    overlap: '🔴',
    energy: '⚡',
    boundary: '🚧',
    adjacency: '📍',
  };
  return icons[type] || '⚠️';
};

const getDefectName = (type: string): string => {
  const names: Record<string, string> = {
    vacancy: '空位',
    interstitial: '间隙原子',
    dislocation: '位错',
    grain_boundary: '晶界',
  };
  return names[type] || type;
};

interface ViolationItemProps {
  violation: Violation;
  index: number;
}

const ViolationItem: React.FC<ViolationItemProps> = ({ violation, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{getViolationIcon(violation.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-red-400">
              {VIOLATION_RULES[violation.type]?.name || violation.type}
            </span>
            {violation.position && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                ({violation.position.x}, {violation.position.y})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{violation.message}</p>
          <p className="text-xs text-slate-500 mt-1">
            违反规则: <span className="text-slate-400">{violation.ruleBroken}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

interface DiffIndicatorProps {
  current: number;
  previous: number | undefined;
}

const DiffIndicator: React.FC<DiffIndicatorProps> = ({ current, previous }) => {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) {
    return (
      <span className="flex items-center gap-1 text-slate-400 text-xs">
        <Minus size={12} /> 持平
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 text-green-400 text-xs">
        <TrendingUp size={12} /> +{diff}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-red-400 text-xs">
      <TrendingDown size={12} /> {diff}
    </span>
  );
};

const ReportPanel: React.FC = () => {
  const { violations, placedDefects, score, isSubmitted, minecartId } = useGameStore();
  const [showHistory, setShowHistory] = useState(false);
  const [previousReport, setPreviousReport] = useState<GameReport | null>(null);

  const handleShowHistory = () => {
    if (!showHistory) {
      const prev = getPreviousMinecartReport(minecartId);
      setPreviousReport(prev);
    }
    setShowHistory(!showHistory);
  };

  const hasData = violations.length > 0 || placedDefects.length > 0;

  return (
    <div className="p-6 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-400" size={20} />
          <h3 className="text-lg font-semibold text-white">成绩报告</h3>
        </div>
        {hasData && (
          <button
            onClick={handleShowHistory}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showHistory
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <ArrowLeftRight size={14} />
            历史对比
          </button>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-slate-500">
          <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
          <p>暂无游戏数据</p>
          <p className="text-sm mt-1">开始放置缺陷后将显示报告</p>
        </div>
      ) : (
        <div className="space-y-4">
          {showHistory && previousReport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-600"
            >
              <h4 className="text-sm font-medium text-white mb-3">历史对比</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">当前矿车 ({minecartId})</p>
                  <p className="text-2xl font-bold text-white">{score.total}</p>
                  <DiffIndicator current={score.total} previous={previousReport.score.total} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">上次矿车 ({previousReport.minecartId})</p>
                  <p className="text-2xl font-bold text-slate-400">{previousReport.score.total}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-400">缺陷数</p>
                  <p className="text-lg font-semibold text-white">{placedDefects.length}</p>
                  <DiffIndicator current={placedDefects.length} previous={previousReport.totalDefects} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">违规数</p>
                  <p className="text-lg font-semibold text-white">{violations.length}</p>
                  <DiffIndicator current={violations.length} previous={previousReport.totalViolations} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">时间</p>
                  <p className="text-lg font-semibold text-white">
                    {new Date(previousReport.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                <Trophy size={14} />
                <span>总得分</span>
              </div>
              <p className="text-2xl font-bold text-white">{score.total}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
                <span>缺陷统计</span>
              </div>
              <p className="text-2xl font-bold text-white">{placedDefects.length}</p>
            </div>
          </div>

          {violations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  违规记录 ({violations.length})
                </h4>
                <span className="text-xs text-slate-500">
                  扣分: -{violations.length * 5}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {violations.map((v, i) => (
                  <ViolationItem key={v.id} violation={v} index={i} />
                ))}
              </div>
            </div>
          )}

          {placedDefects.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">已放置缺陷</h4>
              <div className="flex flex-wrap gap-2">
                {placedDefects.map((defect, i) => (
                  <motion.span
                    key={defect.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300"
                  >
                    ({defect.position.x},{defect.position.y}) {getDefectName(defect.type)}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-lg text-center"
            >
              <Trophy className="mx-auto text-yellow-400 mb-2" size={32} />
              <p className="text-white font-semibold">游戏完成！</p>
              <p className="text-sm text-slate-300 mt-1">
                报告已保存，可在历史记录中查看
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportPanel;
