import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getAthleteRankPath } from '../utils/rankingEngine';
import { Search, ArrowRight, Trophy, Scale, BarChart3, ChevronRight, User, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TracePage = () => {
  const { calculationResult, athletes, events, scores, selectAthlete, selectedAthleteId } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'athlete' | 'rank'>('athlete');
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  const filteredAthletes = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
  const selectedResult = calculationResult?.results.find(
    (r) => r.athleteId === selectedAthleteId
  );
  const rankPath = selectedAthleteId && calculationResult
    ? getAthleteRankPath(selectedAthleteId, calculationResult.results)
    : [];

  const selectedRankResults = selectedRank
    ? calculationResult?.results.filter((r) => r.rank === selectedRank)
    : [];

  const chartData = selectedResult
    ? events.map((event) => ({
        name: event.name,
        raw: scores.find(
          (s) => s.athleteId === selectedAthleteId && s.eventId === event.id
        )?.value || 0,
        weighted: selectedResult.weightedScores[event.id] || 0,
        weight: event.weight,
      }))
    : [];

  const handleAthleteSelect = (athleteId: string) => {
    selectAthlete(athleteId);
    setSearchQuery('');
    setSelectedRank(null);
  };

  const handleRankSelect = (rank: number) => {
    setSelectedRank(rank);
    selectAthlete(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white">溯源查询</h2>
        <p className="text-dark-400 text-sm mt-1">
          从选手成绩查到最终结果，再从结果反查回项目权重
        </p>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSearchMode('athlete')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchMode === 'athlete'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              按选手查询
            </button>
            <button
              onClick={() => setSearchMode('rank')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchMode === 'rank'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <Medal className="w-4 h-4 inline mr-2" />
              按名次查询
            </button>
          </div>

          {searchMode === 'athlete' && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入选手姓名、年级或班级..."
                className="w-full pl-10 pr-4 py-2.5 bg-dark-700 border border-dark-500 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
              />
            </div>
          )}

          {searchMode === 'rank' && (
            <div className="flex-1 flex gap-2 flex-wrap">
              {Array.from({ length: Math.min(10, athletes.length) }, (_, i) => i + 1).map(
                (rank) => (
                  <button
                    key={rank}
                    onClick={() => handleRankSelect(rank)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      selectedRank === rank
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {rank}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {searchMode === 'athlete' && searchQuery && (
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredAthletes.length > 0 ? (
              filteredAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  onClick={() => handleAthleteSelect(athlete.id)}
                  className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors"
                >
                  <div>
                    <p className="font-medium text-white">{athlete.name}</p>
                    <p className="text-sm text-dark-400">
                      {athlete.grade} {athlete.className}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-dark-400" />
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-dark-400">未找到匹配选手</p>
            )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedResult && selectedAthlete && (
          <motion.div
            key="athlete-trace"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-12 gap-6"
          >
            <div className="col-span-5 space-y-6">
              <div className="card p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    <span className="text-2xl font-display font-bold text-white">
                      {selectedAthlete.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedAthlete.name}</h3>
                    <p className="text-dark-400">
                      {selectedAthlete.grade} {selectedAthlete.className}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-primary-400" />
                      <span className="text-3xl font-display font-bold text-primary-400">
                        {selectedResult.rank}
                      </span>
                    </div>
                    <p className="text-sm text-dark-400">最终名次</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-dark-700/50 rounded-lg">
                    <p className="text-2xl font-display font-bold text-success">
                      {selectedResult.totalScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-dark-400">加权总分</p>
                  </div>
                  <div className="p-3 bg-dark-700/50 rounded-lg">
                    <p className="text-sm font-medium text-white">
                      {selectedResult.tieBreakRule || '无同分'}
                    </p>
                    <p className="text-xs text-dark-400">同分规则</p>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="w-5 h-5 text-primary-500" />
                  <h3 className="font-display font-semibold text-white">项目权重明细</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis type="category" dataKey="name" stroke="#64748b" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          value.toFixed(2),
                          name === 'weighted' ? '加权分' : '原始分',
                        ]}
                      />
                      <Bar dataKey="weighted" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#EAB308', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'][index % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="col-span-7">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary-500" />
                  <h3 className="font-display font-semibold text-white">排序路径溯源</h3>
                </div>

                {rankPath.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-dark-600" />

                    <div className="space-y-4">
                      <div className="relative pl-14">
                        <div className="absolute left-4 w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div className="p-4 bg-dark-700/50 rounded-lg border border-dark-600">
                          <h4 className="font-medium text-white">原始成绩</h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {events.map((event) => {
                              const score = scores.find(
                                (s) => s.athleteId === selectedAthleteId && s.eventId === event.id
                              );
                              return (
                                <span
                                  key={event.id}
                                  className="px-2 py-1 bg-dark-600 text-white text-sm rounded"
                                >
                                  {event.name}: {score?.value || 0}{' '}
                                  <span className="text-dark-400">× {event.weight}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {rankPath.map(({ step, position }, index) => (
                        <div key={step.stepNumber} className="relative pl-14">
                          <div className="absolute left-4 w-5 h-5 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center">
                            <span className="text-dark-300 text-xs">{index + 2}</span>
                          </div>
                          <div
                            className={`p-4 rounded-lg border ${
                              step.status === 'stuck'
                                ? 'bg-danger/10 border-danger/30'
                                : 'bg-dark-700/50 border-dark-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-white">{step.ruleName}</h4>
                              <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-sm rounded">
                                第 {position} 位
                              </span>
                            </div>
                            <p className="text-sm text-dark-400">{step.explanation}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {step.tiedAthletes.map((athleteId, i) => {
                                const athlete = athletes.find((a) => a.id === athleteId);
                                const isSelected = athleteId === selectedAthleteId;
                                return (
                                  <span
                                    key={athleteId}
                                    className={`px-2 py-1 text-sm rounded ${
                                      isSelected
                                        ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50'
                                        : 'bg-dark-600 text-dark-200'
                                    }`}
                                  >
                                    {i + 1}. {athlete?.name}
                                    {isSelected && ' ←'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="relative pl-14">
                        <div className="absolute left-4 w-5 h-5 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/30">
                          <Trophy className="w-3 h-3 text-white" />
                        </div>
                        <div className="p-4 bg-success/10 rounded-lg border border-success/30">
                          <div className="flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-success" />
                            <div>
                              <h4 className="font-medium text-success">最终名次确定</h4>
                              <p className="text-sm text-dark-400">
                                第 {selectedResult.rank} 名，总分 {selectedResult.totalScore.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-dark-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-success" />
                    </div>
                    <p className="text-lg font-medium text-white">无同分情况</p>
                    <p className="text-sm">该选手总分唯一，无需应用同分规则</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {selectedRank && selectedRankResults.length > 0 && (
          <motion.div
            key="rank-trace"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-primary-400">
                  {selectedRank}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">第 {selectedRank} 名选手</h3>
                <p className="text-dark-400">共 {selectedRankResults.length} 人并列</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedRankResults.map((result) => {
                const athlete = athletes.find((a) => a.id === result.athleteId);
                return (
                  <div
                    key={result.athleteId}
                    onClick={() => handleAthleteSelect(result.athleteId)}
                    className="p-4 bg-dark-700/50 rounded-lg border border-dark-600 cursor-pointer hover:border-primary-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {athlete?.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{athlete?.name}</p>
                        <p className="text-sm text-dark-400">
                          {athlete?.grade} {athlete?.className}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-primary-400">
                          {result.totalScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-dark-400">总分</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-dark-400" />
                    </div>
                    {result.tieBreakRule && (
                      <div className="mt-3 pt-3 border-t border-dark-600">
                        <p className="text-xs text-dark-400">同分规则: {result.tieBreakRule}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-dark-400 text-sm mt-6">
              💡 点击选手卡片可查看该选手的完整排序路径
            </p>
          </motion.div>
        )}

        {!selectedResult && !selectedRank && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card p-12 text-center"
          >
            <Search className="w-16 h-16 mx-auto mb-4 text-dark-500" />
            <h3 className="text-xl font-medium text-white mb-2">开始溯源查询</h3>
            <p className="text-dark-400 max-w-md mx-auto">
              选择查询方式，输入选手信息或点击名次按钮，系统将展示从原始成绩到最终名次的完整计算路径
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TracePage;
