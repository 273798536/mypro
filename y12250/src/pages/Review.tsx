import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronRight,
  Database,
  Tag,
  Trophy,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useGameStore } from '../store/useGameStore';
import { getLevelById, getMazeNodes, getMazeNode } from '../data/levels';
import { getLevelName } from '../data/levels';
import { FAILURE_TYPE_LABELS } from '../engine/types';
import { formatRatio, formatValue } from '../engine/calculator';
import { getRuleReference } from '../engine/rules';
import type { GameNode, GameState } from '../engine/types';

export default function Review() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { getGameById, playerScores } = useGameStore();

  const [game, setGame] = useState<GameState | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  useEffect(() => {
    if (gameId) {
      const loadedGame = getGameById(gameId);
      setGame(loadedGame);
      if (loadedGame) {
        setCurrentStep(loadedGame.nodeHistory.length);
      }
    }
  }, [gameId, getGameById]);

  useEffect(() => {
    if (!isPlaying || !game) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= game.nodeHistory.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, game, playbackSpeed]);

  const level = game ? getLevelById(game.levelId) : undefined;
  const mazeNodes = level ? getMazeNodes(level.id) : [];
  const score = game
    ? playerScores.find((s) => s.gameId === game.id)
    : undefined;

  const currentDisplayData = useMemo(() => {
    if (!game) return null;

    const nodes = game.nodeHistory.slice(0, currentStep);
    const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;

    return {
      nodes,
      currentRatio: lastNode ? lastNode.collateralRatio : game.collateralRatio,
      currentPrice: lastNode ? lastNode.price : game.currentPrice,
      currentGas: lastNode ? lastNode.gasRemaining : game.gasRemaining,
      path: [game.path[0], ...nodes.map((n) => n.nodeId)],
    };
  }, [game, currentStep]);

  const chartData = useMemo(() => {
    if (!game || !level) return [];

    const data = [
      {
        step: 0,
        抵押率: game.priceHistory[0]
          ? (game.position.collaterals.reduce((sum, c) => sum + c.amount * game.position.oracle.price, 0) /
              game.debtValue) *
            100
          : 150,
        价格: game.priceHistory[0]?.price || 3000,
      },
      ...game.nodeHistory.slice(0, currentStep).map((node, idx) => ({
        step: idx + 1,
        抵押率: node.collateralRatio,
        价格: node.price,
      })),
    ];
    return data;
  }, [game, currentStep, level]);

  if (!game || !level) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-defi-bg">
        <div className="text-defi-text-muted">未找到游戏记录</div>
      </div>
    );
  }

  const handlePlayPause = () => {
    if (currentStep >= game.nodeHistory.length) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    if (currentStep < game.nodeHistory.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-defi-bg">
      <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-defi-text-muted hover:text-defi-text transition-colors"
          >
            <ArrowLeft size={18} />
            返回
          </button>
          <div className="flex items-center gap-3">
            {game.status === 'success' ? (
              <span className="flex items-center gap-2 px-3 py-1 bg-defi-success/20 text-defi-success rounded-full text-sm">
                <CheckCircle size={16} />
                清算成功
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1 bg-defi-danger/20 text-defi-danger rounded-full text-sm">
                <XCircle size={16} />
                {game.failureEvent
                  ? FAILURE_TYPE_LABELS[game.failureEvent.type]
                  : '清算失败'}
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-lg font-bold text-defi-text mb-4 flex items-center gap-2">
                <Play size={20} className="text-defi-accent" />
                路线回放
              </h2>

              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg bg-defi-bg-light hover:bg-defi-card transition-colors"
                >
                  <SkipBack size={20} />
                </button>
                <button
                  onClick={handleStepBack}
                  className="p-2 rounded-lg bg-defi-bg-light hover:bg-defi-card transition-colors"
                  disabled={currentStep === 0}
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="p-4 rounded-full bg-defi-accent text-defi-bg hover:shadow-glow-accent transition-all"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                </button>
                <button
                  onClick={handleStepForward}
                  className="p-2 rounded-lg bg-defi-bg-light hover:bg-defi-card transition-colors"
                  disabled={currentStep >= game.nodeHistory.length}
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => setCurrentStep(game.nodeHistory.length)}
                  className="p-2 rounded-lg bg-defi-bg-light hover:bg-defi-card transition-colors"
                >
                  <SkipForward size={20} />
                </button>

                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-defi-text-muted">速度：</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="bg-defi-bg-light border border-defi-border rounded px-2 py-1 text-sm text-defi-text"
                  >
                    <option value={2000}>0.5x</option>
                    <option value={1000}>1x</option>
                    <option value={500}>2x</option>
                    <option value={250}>4x</option>
                  </select>
                </div>
              </div>

              <div className="relative mb-4">
                <input
                  type="range"
                  min={0}
                  max={game.nodeHistory.length}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  className="w-full h-2 bg-defi-bg-light rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #00FF88 ${(currentStep / game.nodeHistory.length) * 100}%, #2a3a5c ${(currentStep / game.nodeHistory.length) * 100}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-defi-text-muted mt-1">
                  <span>开始</span>
                  <span>
                    {currentStep} / {game.nodeHistory.length} 步
                  </span>
                  <span>结束</span>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5c" />
                    <XAxis
                      dataKey="step"
                      stroke="#8892B0"
                      label={{ value: '步数', position: 'insideBottom', offset: -5, fill: '#8892B0' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#2EC4B6"
                      label={{ value: '抵押率(%)', angle: -90, position: 'insideLeft', fill: '#2EC4B6' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#9D4EDD"
                      label={{ value: '价格(USD)', angle: 90, position: 'insideRight', fill: '#9D4EDD' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a2540',
                        border: '1px solid #2a3a5c',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#E8EDF5' }}
                    />
                    <ReferenceLine
                      yAxisId="left"
                      y={level.safetyRatio}
                      stroke="#FF9F1C"
                      strokeDasharray="5 5"
                      label={{ value: '安全线', fill: '#FF9F1C', fontSize: 12 }}
                    />
                    <ReferenceLine
                      yAxisId="left"
                      y={level.liquidationRatio}
                      stroke="#E63946"
                      strokeDasharray="5 5"
                      label={{ value: '清算线', fill: '#E63946', fontSize: 12 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="抵押率"
                      stroke="#2EC4B6"
                      strokeWidth={2}
                      dot={{ fill: '#2EC4B6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="价格"
                      stroke="#9D4EDD"
                      strokeWidth={2}
                      dot={{ fill: '#9D4EDD', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-defi-bg-light rounded-lg p-3 text-center">
                  <div className="text-xs text-defi-text-muted mb-1">当前抵押率</div>
                  <div
                    className={`text-xl font-mono font-bold ${
                      currentDisplayData &&
                      currentDisplayData.currentRatio >= level.safetyRatio
                        ? 'text-defi-success'
                        : currentDisplayData &&
                          currentDisplayData.currentRatio >= level.liquidationRatio
                        ? 'text-defi-warning'
                        : 'text-defi-danger'
                    }`}
                  >
                    {currentDisplayData
                      ? formatRatio(currentDisplayData.currentRatio)
                      : '—'}
                  </div>
                </div>
                <div className="bg-defi-bg-light rounded-lg p-3 text-center">
                  <div className="text-xs text-defi-text-muted mb-1">预言机价格</div>
                  <div className="text-xl font-mono font-bold text-defi-purple">
                    $
                    {currentDisplayData
                      ? formatValue(currentDisplayData.currentPrice, 0)
                      : '—'}
                  </div>
                </div>
                <div className="bg-defi-bg-light rounded-lg p-3 text-center">
                  <div className="text-xs text-defi-text-muted mb-1">Gas剩余</div>
                  <div className="text-xl font-mono font-bold text-defi-accent">
                    {currentDisplayData ? currentDisplayData.currentGas : '—'}
                  </div>
                </div>
                <div className="bg-defi-bg-light rounded-lg p-3 text-center">
                  <div className="text-xs text-defi-text-muted mb-1">用时</div>
                  <div className="text-xl font-mono font-bold text-defi-text">
                    {score ? `${score.timeUsed}s` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card max-h-80 overflow-auto scrollbar-thin">
              <h3 className="text-sm font-medium text-defi-text-muted mb-3">操作历史</h3>
              <div className="space-y-2">
                {game.nodeHistory.slice(0, currentStep).map((node, idx) => (
                  <div
                    key={node.id}
                    className={`p-3 rounded-lg border transition-all ${
                      idx === currentStep - 1
                        ? 'border-defi-accent bg-defi-accent/5'
                        : 'border-defi-border bg-defi-bg-light'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-defi-purple/20 text-defi-purple flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-defi-text">{node.choiceLabel}</span>
                      </div>
                      <span className="text-xs text-defi-text-muted">
                        {new Date(node.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                    <div className="text-sm text-defi-text-muted mb-1">
                      {node.ruleFeedback}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={node.priceEvent.includes('下跌') ? 'text-defi-danger' : node.priceEvent.includes('上涨') ? 'text-defi-success' : 'text-defi-text-muted'}>
                        {node.priceEvent}
                      </span>
                      <span className="text-defi-text-muted">
                        抵押率: {formatRatio(node.collateralRatio)}
                      </span>
                      <span className="text-defi-text-muted">
                        Gas: -{node.gasUsed}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {game.failureEvent && (
              <div className="card border-defi-warning/30">
                <h3 className="text-sm font-medium text-defi-warning mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  影响链路分析
                </h3>
                <div className="space-y-3">
                  {game.failureEvent.impactChain.map((link, idx) => (
                    <div key={link.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? 'bg-defi-warning text-defi-bg'
                              : idx === game.failureEvent!.impactChain.length - 1
                              ? 'bg-defi-danger text-white'
                              : 'bg-defi-border text-defi-text'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {idx < game.failureEvent.impactChain.length - 1 && (
                          <div className="w-0.5 h-full bg-defi-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="font-medium text-defi-text text-sm mb-1">
                          {link.description}
                        </div>
                        <div className="text-xs text-defi-text-muted">
                          <span className="text-defi-purple">{link.affectedMetric}</span>
                          <ChevronRight size={10} className="inline mx-1" />
                          <span className="font-mono text-defi-accent">
                            {link.change}
                          </span>
                        </div>
                        <div className="text-[10px] text-defi-text-muted/70 bg-defi-bg/50 px-2 py-1 rounded mt-1">
                          {getRuleReference(link.ruleReference)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-defi-border">
                  <h4 className="text-xs text-defi-warning mb-2">影响的结果</h4>
                  <div className="flex flex-wrap gap-1">
                    {game.failureEvent.affectedResults.map((result, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-defi-warning/10 text-defi-warning rounded text-xs"
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="card border-defi-purple/30">
              <h3 className="text-sm font-medium text-defi-purple mb-3 flex items-center gap-2">
                <Database size={16} />
                数据对照详情
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-defi-text-muted mb-2 flex items-center gap-1">
                    <Tag size={12} />
                    借贷仓位
                  </h4>
                  <div className="bg-defi-bg-light rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">ID</span>
                      <span className="font-mono text-defi-text">{game.position.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">来源</span>
                      <span className="font-mono text-defi-text">{game.position.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">版本</span>
                      <span className="font-mono text-defi-text">{game.position.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">债务金额</span>
                      <span className="font-mono text-defi-text">
                        {game.position.debtAmount} {game.position.debtAsset}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-defi-text-muted mb-2 flex items-center gap-1">
                    <Database size={12} />
                    抵押物配置
                  </h4>
                  {game.position.collaterals.map((col, idx) => (
                    <div key={idx} className="bg-defi-bg-light rounded-lg p-3 space-y-2 text-xs mb-2">
                      <div className="flex justify-between">
                        <span className="text-defi-text-muted">资产</span>
                        <span className="font-mono text-defi-accent">{col.asset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-defi-text-muted">数量</span>
                        <span className="font-mono text-defi-text">{col.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-defi-text-muted">来源</span>
                        <span className="font-mono text-defi-text">{col.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-defi-text-muted">版本</span>
                        <span className="font-mono text-defi-text">{col.version}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-xs text-defi-text-muted mb-2 flex items-center gap-1">
                    <Trophy size={12} />
                    排行榜成绩
                  </h4>
                  <div className="bg-defi-bg-light rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">玩家</span>
                      <span className="font-mono text-defi-text">{game.playerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">关卡</span>
                      <span className="font-mono text-defi-text">{getLevelName(game.levelId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">仓位ID</span>
                      <span className="font-mono text-defi-accent">{game.position.id}</span>
                    </div>
                    {score ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-defi-text-muted">得分</span>
                          <span className="font-mono text-defi-warning font-bold">{score.score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-defi-text-muted">用时</span>
                          <span className="font-mono text-defi-text">{score.timeUsed}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-defi-text-muted">平均抵押率</span>
                          <span className="font-mono text-defi-text">
                            {formatRatio(score.avgCollateralRatio)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-defi-danger text-center py-2">
                        未进入排行榜（清算失败）
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {score && (
              <div className="card border-defi-accent/30 text-center">
                <Trophy size={32} className="mx-auto text-defi-warning mb-2" />
                <div className="text-sm text-defi-text-muted mb-1">最终得分</div>
                <div className="text-4xl font-mono font-bold text-defi-warning">
                  {score.score}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
