import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { 
  ArrowLeft, 
  RotateCcw, 
  History, 
  Home, 
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Award,
  Database
} from 'lucide-react';
import { loadGameState, loadGameHistory, loadDataSource } from '../utils/storage';
import { detectDataMergeErrors } from '../utils/deduplication';
import { ScoringEngine } from '../engine/scoring';
import type { GameState, GameScore, Deduction, ScoreBreakdown, GameHistory, DataSource } from '../engine/types';
import { DataSourcePanel } from '../components/common/DataSourcePanel';

const categoryNames: Record<keyof ScoreBreakdown, string> = {
  congestionManagement: '拥堵管理',
  patrolCoverage: '巡逻覆盖',
  emergencyResponse: '应急响应',
  resourceAllocation: '资源配置',
  overallSituation: '整体态势'
};

const categoryColors: Record<keyof ScoreBreakdown, string> = {
  congestionManagement: '#06b6d4',
  patrolCoverage: '#22c55e',
  emergencyResponse: '#f97316',
  resourceAllocation: '#8b5cf6',
  overallSituation: '#ec4899'
};

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  'S': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  'A': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  'B': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  'C': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  'D': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
  'F': { bg: 'bg-red-700/20', text: 'text-red-500', border: 'border-red-700' }
};

export default function ResultPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory | null>(null);
  const [score, setScore] = useState<GameScore | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSourcePanelOpen, setDataSourcePanelOpen] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<DataSource | null>(null);
  const [mergeErrors, setMergeErrors] = useState<string[]>([]);
  const [dirtyDataFound, setDirtyDataFound] = useState(false);

  const scoringEngine = useMemo(() => new ScoringEngine(), []);

  useEffect(() => {
    if (!gameId) return;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [state, history] = await Promise.all([
          loadGameState(gameId),
          loadGameHistory(gameId)
        ]);
        
        if (!state) {
          throw new Error('未找到对局数据');
        }
        
        setGameState(state);
        setGameHistory(history);
        
        if (state.score) {
          setScore(state.score);
        } else {
          scoringEngine.resetDeductions();
          const calculatedScore = scoringEngine.calculateScore(state);
          setScore(calculatedScore);
        }
        
        const uniqueDataSourceIds = new Set<string>();
        state.decisions.forEach(d => d.dataSourceIds.forEach(id => uniqueDataSourceIds.add(id)));
        state.events.forEach(e => uniqueDataSourceIds.add(e.dataSourceId));
        
        const loadedDataSources: DataSource[] = [];
        for (const id of uniqueDataSourceIds) {
          const ds = await loadDataSource(id);
          if (ds) loadedDataSources.push(ds);
        }
        setDataSources(loadedDataSources);
        
        const errors = detectDataMergeErrors(state.events, loadedDataSources);
        setMergeErrors(errors);
        
        const hasDirtyData = loadedDataSources.some(ds => 
          ds.originalFile.includes('dirty') || ds.title.includes('脏数据')
        );
        setDirtyDataFound(hasDirtyData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [gameId, scoringEngine]);

  const radarData = useMemo(() => {
    if (!score) return [];
    
    return Object.entries(score.breakdown).map(([key, value]) => ({
      category: categoryNames[key as keyof ScoreBreakdown],
      score: value,
      fullMark: 100
    }));
  }, [score]);

  const deductionsByCategory = useMemo(() => {
    if (!score) return [];
    
    const grouped: Record<string, number> = {};
    score.deductions.forEach(d => {
      grouped[d.category] = (grouped[d.category] || 0) + d.points;
    });
    
    return Object.entries(grouped).map(([category, points]) => ({
      category: categoryNames[category as keyof ScoreBreakdown],
      points,
      fill: categoryColors[category as keyof ScoreBreakdown]
    }));
  }, [score]);

  const interpretation = useMemo(() => {
    if (!score) return null;
    return scoringEngine.getScoreInterpretation(score.totalScore, score.grade);
  }, [score, scoringEngine]);

  const handleViewDataSource = (dataSourceId: string) => {
    const ds = getDataSourceById(dataSourceId);
    setCurrentDataSource(ds || null);
    setDataSourcePanelOpen(true);
  };

  const getDataSourceById = (id: string): DataSource | undefined => {
    return dataSources.find(ds => ds.id === id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300 text-lg">加载评估报告...</div>
      </div>
    );
  }

  if (error || !gameState || !score) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-lg">{error || '数据加载失败'}</div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  const gradeColor = gradeColors[score.grade] || gradeColors['F'];
  const totalDeductionPoints = score.deductions.reduce((sum, d) => sum + d.points, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-xl font-bold text-cyan-400 tracking-wide">安保任务评估报告</h1>
              <p className="text-xs text-slate-400">MISSION ASSESSMENT REPORT</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {dirtyDataFound && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">检测到脏数据</span>
              </div>
            )}
            {mergeErrors.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{mergeErrors.length}个数据合并异常</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${gradeColor.bg} border-2 ${gradeColor.border} rounded-2xl p-8 text-center`}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Award className={`w-12 h-12 ${gradeColor.text}`} />
            <div>
              <div className={`text-6xl font-bold ${gradeColor.text}`}>{score.grade}</div>
              <div className="text-slate-400">综合评级</div>
            </div>
          </div>
          
          <div className="text-4xl font-bold text-white mb-2">
            {score.totalScore.toFixed(1)}
            <span className="text-xl text-slate-400 font-normal"> / 100</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-slate-300 mb-4">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span>总扣分数: <span className="text-red-400 font-bold">{totalDeductionPoints}</span> 分</span>
          </div>
          
          {interpretation && (
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {interpretation.overall}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              能力雷达图
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                  />
                  <Radar
                    name="得分"
                    dataKey="score"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              扣分分布
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deductionsByCategory} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#94a3b8' }} />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                    formatter={(value: number) => [`${value} 分`, '扣分数']}
                  />
                  <Bar dataKey="points" radius={[0, 4, 4, 0]}>
                    {deductionsByCategory.map((entry, index) => (
                      <rect key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800 rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            扣分明细
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {score.deductions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>完美！没有任何扣分</p>
              </div>
            ) : (
              score.deductions.map((deduction: Deduction, index: number) => {
                const event = gameState.events.find(e => e.id === deduction.eventId);
                const dataSource = event ? dataSources.find(ds => ds.id === event.dataSourceId) : null;
                
                return (
                  <motion.div
                    key={deduction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg border-l-4 border-red-500"
                  >
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-2xl font-bold text-red-400">-{deduction.points}</div>
                      <div className="text-xs text-slate-400">分</div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs rounded" style={{ backgroundColor: categoryColors[deduction.category] + '30', color: categoryColors[deduction.category] }}>
                          {categoryNames[deduction.category]}
                        </span>
                        {dataSource && (
                          <button
                            onClick={() => handleViewDataSource(dataSource.id)}
                            className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                          >
                            <Database className="w-3 h-3" />
                            查看来源
                          </button>
                        )}
                      </div>
                      <p className="text-slate-300">{deduction.reason}</p>
                      {event && (
                        <p className="text-sm text-slate-500 mt-1">
                          相关事件: {event.title} (游戏时间: {Math.floor(event.timestamp / 60)}:{String(Math.floor(event.timestamp % 60)).padStart(2, '0')})
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {mergeErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-red-900/30 border border-red-500/50 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              数据合并异常检测
            </h3>
            <div className="space-y-2">
              {mergeErrors.map((error, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-red-300">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {interpretation && (interpretation.strengths.length > 0 || interpretation.improvements.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {interpretation.strengths.length > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  做得好的地方
                </h3>
                <ul className="space-y-2">
                  {interpretation.strengths.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-green-300">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {interpretation.improvements.length > 0 && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  需要改进
                </h3>
                <ul className="space-y-2">
                  {interpretation.improvements.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-orange-300">
                      <span className="text-orange-500 mt-0.5">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap justify-center gap-4 pt-4 pb-8"
        >
          <button
            onClick={() => navigate(`/game/${gameState.mapId}`)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            再来一局
          </button>
          
          <button
            onClick={() => navigate(`/review/${gameId}`)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all hover:scale-105"
          >
            <History className="w-5 h-5" />
            复盘分析
          </button>
          
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all hover:scale-105"
          >
            <History className="w-5 h-5" />
            历史记录
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all hover:scale-105"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
        </motion.div>
      </div>

      <DataSourcePanel
        isOpen={dataSourcePanelOpen}
        onClose={() => setDataSourcePanelOpen(false)}
        dataSource={currentDataSource}
      />
    </div>
  );
}
