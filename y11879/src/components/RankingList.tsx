import { useAppStore } from '../store/appStore';
import { Medal, ChevronDown, ChevronUp, Trophy, Award, Star } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RankingList = () => {
  const { calculationResult, athletes, selectAthlete, selectedAthleteId } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedResults = calculationResult?.results
    .slice()
    .sort((a, b) => a.rank - b.rank);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Star className="w-5 h-5 text-amber-600" />;
      default:
        return <Medal className="w-5 h-5 text-dark-400" />;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/50';
      default:
        return 'bg-dark-700/50 border-dark-600/50';
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary-500" />
        <h3 className="font-display font-semibold text-white">排名结果</h3>
        {calculationResult && (
          <span className="ml-auto text-xs text-dark-400">
            共 {calculationResult.results.length} 人
          </span>
        )}
      </div>

      {sortedResults && sortedResults.length > 0 ? (
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
          {sortedResults.map((result) => {
            const athlete = athletes.find((a) => a.id === result.athleteId);
            const isSelected = selectedAthleteId === result.athleteId;
            const isExpanded = expandedId === result.athleteId;

            return (
              <motion.div
                key={result.athleteId}
                layout
                className={`rounded-lg border cursor-pointer transition-all duration-200 ${getRankBg(result.rank)} ${
                  isSelected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-dark-900' : ''
                }`}
                onClick={() => selectAthlete(isSelected ? null : result.athleteId)}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="flex items-center justify-center w-8 h-8">
                    {result.rank <= 3 ? (
                      getRankIcon(result.rank)
                    ) : (
                      <span className="font-display font-bold text-dark-300">
                        {result.rank}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{athlete?.name}</p>
                    <p className="text-xs text-dark-400">
                      {athlete?.grade} {athlete?.className}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-display font-bold text-primary-400">
                      {result.totalScore.toFixed(1)}
                    </p>
                    {result.tieBreakRule && (
                      <p className="text-xs text-warning">{result.tieBreakRule}</p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : result.athleteId);
                    }}
                    className="p-1 hover:bg-dark-600/50 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-dark-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-dark-400" />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-0 border-t border-dark-600/50">
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-dark-400 mb-2">同分规则应用路径</p>
                          {result.steps.length > 0 ? (
                            result.steps.map((step, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-sm"
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    step.status === 'resolved'
                                      ? 'bg-success'
                                      : step.status === 'stuck'
                                      ? 'bg-danger'
                                      : 'bg-warning'
                                  }`}
                                />
                                <span className="text-dark-200">{step.ruleName}</span>
                                <span className="text-dark-400 ml-auto">
                                  {step.status === 'resolved' && '✓ 已区分'}
                                  {step.status === 'tied' && '→ 继续'}
                                  {step.status === 'stuck' && '⚠ 卡壳'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-dark-400">无同分情况</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-dark-400">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无排名数据</p>
          <p className="text-sm">请先导入数据并配置规则</p>
        </div>
      )}
    </div>
  );
};

export default RankingList;
