import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { getGrade, formatTime, exportReport, exportToCSV } from '../../utils/export';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';
import {
  Home,
  RotateCcw,
  Download,
  FileText,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export const ResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    totalScore,
    satisfaction,
    stats,
    scoreBreakdown,
    anomalies,
    actionLog,
    gameTime,
    history,
    loadHistory,
    restartGame,
    initGame,
    level,
  } = useGameStore();

  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'replay'>('overview');

  const { grade, color } = getGrade(totalScore);
  const isPassed = totalScore >= 60;

  useEffect(() => {
    if (totalScore === 100 && stats.totalArrivals === 0) {
      navigate('/');
    }
  }, [totalScore, stats.totalArrivals, navigate]);

  useEffect(() => {
    let interval: number;
    if (isReplaying && history.length > 0) {
      interval = window.setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= history.length - 1) {
            setIsReplaying(false);
            return prev;
          }
          loadHistory(prev + 1);
          return prev + 1;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isReplaying, history.length, loadHistory]);

  const scoreData = [
    { name: '准点率', score: scoreBreakdown.punctuality.score, max: scoreBreakdown.punctuality.maxScore, fill: '#3B82F6' },
    { name: '覆盖率', score: scoreBreakdown.coverage.score, max: scoreBreakdown.coverage.maxScore, fill: '#10B981' },
    { name: '满意度', score: scoreBreakdown.satisfaction.score, max: scoreBreakdown.satisfaction.maxScore, fill: '#8B5CF6' },
    { name: '效率', score: scoreBreakdown.efficiency.score, max: scoreBreakdown.efficiency.maxScore, fill: '#F59E0B' },
    { name: '响应', score: scoreBreakdown.response.score, max: scoreBreakdown.response.maxScore, fill: '#EC4899' },
  ];

  const satisfactionHistory = history.slice(0, replayIndex + 1).map((h, i) => ({
    time: i,
    satisfaction: h.satisfaction,
    score: h.totalScore,
  }));

  const handleRestart = () => {
    restartGame();
    navigate('/game');
  };

  const handleBackToMenu = () => {
    initGame(level);
    navigate('/');
  };

  const handleExportReport = () => {
    exportReport(useGameStore.getState());
  };

  const handleExportCSV = () => {
    exportToCSV(anomalies, scoreBreakdown, actionLog);
  };

  return (
    <div className="min-h-screen bg-dispatch-bg p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-mono font-bold mb-2">调度结算报告</h1>
            <p className="text-dispatch-text-muted">
              游戏时长: {formatTime(gameTime)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleBackToMenu}>
              <Home size={16} className="mr-2" />
              返回菜单
            </Button>
            <Button onClick={handleRestart}>
              <RotateCcw size={16} className="mr-2" />
              再来一局
            </Button>
          </div>
        </div>

        <div className={`rounded-2xl p-8 mb-8 border-2 ${
          isPassed
            ? 'bg-dispatch-success/10 border-dispatch-success/30'
            : 'bg-dispatch-danger/10 border-dispatch-danger/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="text-8xl font-bold font-mono"
                  style={{ color }}
                >
                  {grade}
                </div>
                <div>
                  <div className="text-5xl font-bold font-mono mb-2">
                    {totalScore.toFixed(1)}
                    <span className="text-2xl text-dispatch-text-muted">/100</span>
                  </div>
                  <div className={`text-lg ${isPassed ? 'text-dispatch-success' : 'text-dispatch-danger'}`}>
                    {isPassed ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle size={20} />
                        调度成功！
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <XCircle size={20} />
                        需要改进
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-6 text-sm">
                <div>
                  <div className="text-dispatch-text-muted mb-1">乘客满意度</div>
                  <div className="text-2xl font-mono">{satisfaction.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-dispatch-text-muted mb-1">服务站点</div>
                  <div className="text-2xl font-mono">{stats.totalStopsServed}</div>
                </div>
                <div>
                  <div className="text-dispatch-text-muted mb-1">准点率</div>
                  <div className="text-2xl font-mono">
                    {stats.totalArrivals > 0
                      ? ((stats.onTimeArrivals / stats.totalArrivals) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
                <div>
                  <div className="text-dispatch-text-muted mb-1">异常次数</div>
                  <div className="text-2xl font-mono text-dispatch-danger">{anomalies.length}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={handleExportReport}>
                <FileText size={16} className="mr-2" />
                导出报告
              </Button>
              <Button variant="secondary" onClick={handleExportCSV}>
                <Download size={16} className="mr-2" />
                导出CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-dispatch-border">
          {[
            { id: 'overview', label: '评分概览', icon: <BarChart3 size={16} /> },
            { id: 'timeline', label: '事件时间线', icon: <TrendingUp size={16} /> },
            { id: 'replay', label: '游戏回放', icon: <Play size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 font-mono text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-dispatch-primary text-dispatch-primary'
                  : 'border-transparent text-dispatch-text-muted hover:text-dispatch-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Panel title="评分分布">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" domain={[0, 30]} stroke="#94A3B8" />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" width={60} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any, name: any, props: any) => [
                        `${value}/${props.payload.max}`,
                        name,
                      ]}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="评分明细">
              <div className="space-y-4">
                {scoreData.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.name}</span>
                      <span className="font-mono">
                        {item.score}/{item.max}
                      </span>
                    </div>
                    <div className="h-2 bg-dispatch-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(item.score / item.max) * 100}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                    <div className="text-xs text-dispatch-text-muted mt-1">
                      {scoreBreakdown[item.name.toLowerCase() as keyof typeof scoreBreakdown]?.details?.[0] || ''}
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-dispatch-border">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dispatch-danger">扣分合计</span>
                    <span className="font-mono text-dispatch-danger">
                      -{scoreBreakdown.penalties.total}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="运营统计" className="md:col-span-2">
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center p-4 bg-dispatch-bg rounded-lg">
                  <div className="text-3xl font-mono font-bold text-dispatch-primary mb-1">
                    {stats.totalArrivals}
                  </div>
                  <div className="text-sm text-dispatch-text-muted">总到站次数</div>
                </div>
                <div className="text-center p-4 bg-dispatch-bg rounded-lg">
                  <div className="text-3xl font-mono font-bold text-dispatch-success mb-1">
                    {stats.onTimeArrivals}
                  </div>
                  <div className="text-sm text-dispatch-text-muted">准点到站</div>
                </div>
                <div className="text-center p-4 bg-dispatch-bg rounded-lg">
                  <div className="text-3xl font-mono font-bold text-dispatch-warning mb-1">
                    {stats.totalPassengersServed}
                  </div>
                  <div className="text-sm text-dispatch-text-muted">服务乘客</div>
                </div>
                <div className="text-center p-4 bg-dispatch-bg rounded-lg">
                  <div className="text-3xl font-mono font-bold text-dispatch-danger mb-1">
                    {anomalies.length}
                  </div>
                  <div className="text-sm text-dispatch-text-muted">异常记录</div>
                </div>
              </div>
            </Panel>

            {scoreBreakdown.penalties.details.length > 0 && (
              <Panel title="扣分详情" className="md:col-span-2">
                <div className="space-y-2 max-h-48 overflow-auto">
                  {scoreBreakdown.penalties.details.map((detail, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-dispatch-bg rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-dispatch-warning" />
                        <span>{detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <Panel title="关键事件时间线">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-dispatch-border" />
                <div className="space-y-4">
                  {[...actionLog, ...anomalies.map((a) => ({
                    id: a.id,
                    timestamp: a.timestamp,
                    description: a.description,
                    type: 'anomaly' as const,
                    scoreImpact: a.scoreImpact,
                  }))]
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((item, index) => (
                      <div key={item.id || index} className="relative pl-12">
                        <div
                          className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-dispatch-bg ${
                            'scoreImpact' in item
                              ? 'bg-dispatch-danger'
                              : 'bg-dispatch-primary'
                          }`}
                        />
                        <div className="bg-dispatch-bg rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-dispatch-text-muted">
                              {formatTime(item.timestamp)}
                            </span>
                            {'scoreImpact' in item && (
                              <span className="text-xs text-dispatch-danger font-mono">
                                -{item.scoreImpact}分
                              </span>
                            )}
                          </div>
                          <div className="text-sm">{item.description}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'replay' && (
          <div className="space-y-6">
            <Panel title="游戏回放">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReplayIndex(0);
                    loadHistory(0);
                  }}
                >
                  <SkipBack size={16} />
                </Button>
                <Button
                  variant={isReplaying ? 'warning' : 'primary'}
                  onClick={() => setIsReplaying(!isReplaying)}
                >
                  {isReplaying ? <Pause size={16} className="mr-2" /> : <Play size={16} className="mr-2" />}
                  {isReplaying ? '暂停' : '播放'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReplayIndex(history.length - 1);
                    loadHistory(history.length - 1);
                  }}
                >
                  <SkipForward size={16} />
                </Button>
              </div>

              <div className="mb-6">
                <input
                  type="range"
                  min={0}
                  max={history.length - 1}
                  value={replayIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    setReplayIndex(idx);
                    loadHistory(idx);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-dispatch-text-muted mt-1">
                  <span>开始</span>
                  <span>{formatTime((replayIndex / Math.max(1, history.length - 1)) * gameTime)}</span>
                  <span>结束</span>
                </div>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={satisfactionHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="satisfaction"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                      name="满意度"
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      name="评分"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
};
