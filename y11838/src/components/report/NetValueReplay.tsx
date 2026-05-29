import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useGameStore } from '@/store/useGameStore';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function NetValueReplay() {
  const { gameState, industryCards, newsEvents } = useGameStore();
  const [playbackRound, setPlaybackRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const history = gameState?.netValueHistory || [];

  useEffect(() => {
    if (!isPlaying) return;
    if (playbackRound >= history.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setPlaybackRound((prev) => Math.min(prev + 1, history.length - 1));
    }, 1500 / speed);

    return () => clearTimeout(timer);
  }, [isPlaying, playbackRound, history.length, speed]);

  const playbackData = useMemo(() => {
    return history.slice(0, playbackRound + 1).map((point, idx) => {
      const decision = gameState?.decisions.find((d) => d.id === point.decisionId);
      const news = decision
        ? newsEvents.find((n) => n.id === decision.newsEventId)
        : null;
      const industry = decision
        ? industryCards.find((c) => c.id === decision.industryCardId)
        : null;
      const riskEvent = gameState?.riskEvents.find((r) => r.id === point.riskEventId);

      const prevValue = idx > 0 ? history[idx - 1].value : point.value;
      const change = point.value - prevValue;
      const changePercent = prevValue > 0 ? ((change / prevValue) * 100).toFixed(2) : '0.00';

      return {
        round: `第${point.round}回合`,
        roundNum: point.round,
        value: Number(point.value.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent,
        action: decision
          ? decision.actionType === 'buy'
            ? '加仓'
            : decision.actionType === 'sell'
            ? '减仓'
            : '持有'
          : '开始',
        amount: decision?.amount || 0,
        industry: industry?.name || '-',
        news: news?.title || '-',
        hasRisk: !!riskEvent,
        riskType: riskEvent?.type || '',
        riskPenalty: riskEvent?.penalty || 0,
      };
    });
  }, [playbackRound, history, gameState, industryCards, newsEvents]);

  const currentPoint = playbackData[playbackData.length - 1];
  const initialValue = history[0]?.value || 100;
  const currentValue = currentPoint?.value || initialValue;
  const totalChange = currentValue - initialValue;
  const totalChangePercent = ((totalChange / initialValue) * 100).toFixed(2);
  const isProfit = totalChange >= 0;

  if (!gameState) return null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
          <p className="font-bold text-gray-800 text-lg">{data.round}</p>
          <p className="text-xl font-mono font-bold text-primary-600 my-1">
            净值: {data.value}
          </p>
          <p
            className={cn(
              'font-mono font-medium',
              data.change >= 0 ? 'text-accent-profit' : 'text-accent-loss'
            )}
          >
            {data.change >= 0 ? '+' : ''}
            {data.change} ({data.change >= 0 ? '+' : ''}
            {data.changePercent}%)
          </p>
          {data.industry !== '-' && (
            <>
              <div className="h-px bg-gray-200 my-2" />
              <p className="text-sm text-gray-600">
                <span className="font-medium">{data.industry}</span>: {data.action}
                {data.amount > 0 && ` ¥${data.amount.toLocaleString()}`}
              </p>
              <p className="text-xs text-gray-500 mt-1">{data.news}</p>
            </>
          )}
          {data.hasRisk && (
            <p className="text-sm text-red-500 font-medium mt-2">
              ⚠️ 触发风险事件: -{data.riskPenalty}分
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const handlePlayPause = () => {
    if (playbackRound >= history.length - 1) {
      setPlaybackRound(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setPlaybackRound(0);
    setIsPlaying(false);
  };

  const handleStepBack = () => {
    setPlaybackRound((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    setPlaybackRound((prev) => Math.min(prev + 1, history.length - 1));
    setIsPlaying(false);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-primary-600 flex items-center gap-2">
          {isProfit ? (
            <TrendingUp className="w-6 h-6 text-accent-profit" />
          ) : (
            <TrendingDown className="w-6 h-6 text-accent-loss" />
          )}
          净值回放
        </h3>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-gray-500">最终净值</p>
            <p className="text-2xl font-mono font-bold text-primary-600">
              {currentValue.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">累计收益</p>
            <p
              className={cn(
                'text-2xl font-mono font-bold',
                isProfit ? 'text-accent-profit' : 'text-accent-loss'
              )}
            >
              {isProfit ? '+' : ''}
              {totalChangePercent}%
            </p>
          </div>
        </div>
      </div>

      <div className="progress-bar mb-4 h-2">
        <div
          className={cn(
            'progress-fill h-full rounded-full transition-all duration-500',
            isProfit
              ? 'bg-gradient-to-r from-green-400 to-emerald-500'
              : 'bg-gradient-to-r from-red-400 to-rose-500'
          )}
          style={{ width: `${(playbackRound / (history.length - 1)) * 100}%` }}
        />
      </div>

      <div className="relative h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={playbackData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="replayColorValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isProfit ? '#10b981' : '#e63946'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isProfit ? '#10b981' : '#e63946'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="round"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={initialValue}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              label={{ value: '初始净值', position: 'right', fill: '#9ca3af', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isProfit ? '#10b981' : '#e63946'}
              strokeWidth={3}
              fill="url(#replayColorValue)"
              animationDuration={300}
              activeDot={{
                r: 8,
                fill: isProfit ? '#10b981' : '#e63946',
                stroke: '#fff',
                strokeWidth: 3,
              }}
              dot={{ r: 5, fill: '#fff', stroke: isProfit ? '#10b981' : '#e63946', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          title="重置"
        >
          <RotateCcw className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={handleStepBack}
          disabled={playbackRound === 0}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="上一帧"
        >
          <SkipBack className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-4 rounded-full bg-primary-500 hover:bg-primary-600 text-white transition-colors shadow-lg hover:shadow-xl"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>
        <button
          onClick={handleStepForward}
          disabled={playbackRound >= history.length - 1}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="下一帧"
        >
          <SkipForward className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-500">速度:</span>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                speed === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {currentPoint && currentPoint.roundNum > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">当前帧: {currentPoint.round}</p>
              <p className="font-medium text-gray-800">
                {currentPoint.industry !== '-' && (
                  <>
                    <span className="text-primary-600 font-bold">{currentPoint.industry}</span>
                    {' · '}
                    {currentPoint.action}
                    {currentPoint.amount > 0 && ` ¥${currentPoint.amount.toLocaleString()}`}
                  </>
                )}
              </p>
              {currentPoint.news !== '-' && (
                <p className="text-sm text-gray-600 mt-1">{currentPoint.news}</p>
              )}
            </div>
            <div className="text-right">
              <p
                className={cn(
                  'text-2xl font-mono font-bold',
                  currentPoint.change >= 0 ? 'text-accent-profit' : 'text-accent-loss'
                )}
              >
                {currentPoint.change >= 0 ? '+' : ''}
                {currentPoint.changePercent}%
              </p>
              <p className="text-sm text-gray-500">本回合收益</p>
            </div>
          </div>
          {currentPoint.hasRisk && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm">
                ⚠️ 本回合触发风险事件，扣除 {currentPoint.riskPenalty} 分风险评分
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
