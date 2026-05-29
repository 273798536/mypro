import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Home,
  Play,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getGameReplay } from '../store/gameStore';
import { formatTime } from '../utils/scoring';
import { LEVEL_CONFIGS } from '../data/levels';
import type { ScoreItem, Anomaly } from '../types';

function ScoreBreakdownChart({ scoreHistory }: { scoreHistory: ScoreItem[] }) {
  const data = useMemo(() => {
    const orderComplete = scoreHistory
      .filter(s => s.type === 'order_complete')
      .reduce((sum, s) => sum + s.value, 0);
    const efficiency = scoreHistory
      .filter(s => s.type === 'efficiency')
      .reduce((sum, s) => sum + s.value, 0);
    const penalty = scoreHistory
      .filter(s => s.type === 'penalty')
      .reduce((sum, s) => sum + s.value, 0);
    const bonus = scoreHistory
      .filter(s => s.type === 'bonus')
      .reduce((sum, s) => sum + s.value, 0);
    return [
      { name: '订单完成', value: orderComplete, color: '#10B981' },
      { name: '效率奖励', value: efficiency, color: '#3B82F6' },
      { name: '异常扣分', value: penalty, color: '#EF4444' },
      { name: '额外奖励', value: bonus, color: '#F59E0B' },
    ];
  }, [scoreHistory]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
          <YAxis stroke="#94A3B8" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }}
            labelStyle={{ color: '#F1F5F9' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AnomalyPieChart({ anomalies }: { anomalies: Anomaly[] }) {
  const data = useMemo(() => {
    const types: Record<string, number> = { collision: 0, low_battery: 0, timeout: 0 };
    anomalies.forEach(a => {
      types[a.type] = (types[a.type] || 0) + 1;
    });
    return [
      { name: '碰撞', value: types.collision, color: '#EF4444' },
      { name: '低电量', value: types.low_battery, color: '#F97316' },
      { name: '超时', value: types.timeout, color: '#EAB308' },
    ];
  }, [anomalies]);

  return (
    <div className="h-64 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Result() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const replayData = useMemo(() => {
    if (!gameId) return null;
    return getGameReplay(gameId);
  }, [gameId]);

  const gameInfo = useMemo(() => {
    if (!replayData) return null;
    const { state } = replayData;
    const config = LEVEL_CONFIGS[state.level];
    const completedOrders = state.orders.filter(o => o.status === 'completed').length;
    const totalOrders = state.orders.length;
    return { state, config, completedOrders, totalOrders };
  }, [replayData]);

  const exportToCSV = () => {
    if (!gameInfo) return;
    const { state } = gameInfo;
    const headers = ['时间', '类型', '描述', '分值', '来源'];
    const rows = state.scoreHistory.map(s => [
      new Date(s.timestamp).toLocaleTimeString(),
      s.type,
      s.description,
      s.value,
      s.source,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `游戏成绩_${new Date(state.startTime).toLocaleDateString()}.csv`;
    link.click();
  };

  if (!replayData || !gameInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">未找到游戏记录</h1>
          <p className="text-slate-400 mb-6">该游戏记录不存在或已被删除</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const { state, config, completedOrders, totalOrders } = gameInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500 rounded-full mb-4 shadow-lg shadow-yellow-500/30">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">游戏结算</h1>
          <p className="text-slate-400">{config.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-white mb-2">{state.totalScore}</div>
            <div className="text-slate-400 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              总得分
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">
              {completedOrders}/{totalOrders}
            </div>
            <div className="text-slate-400 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              完成订单
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {formatTime(state.elapsedTime)}
            </div>
            <div className="text-slate-400 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              用时
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-red-400 mb-2">{state.anomalies.length}</div>
            <div className="text-slate-400 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              异常次数
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">得分构成</h3>
            <ScoreBreakdownChart scoreHistory={state.scoreHistory} />
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">异常类型分布</h3>
            <AnomalyPieChart anomalies={state.anomalies} />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">得分明细</h3>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800">
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3">时间</th>
                  <th className="pb-3">类型</th>
                  <th className="pb-3">描述</th>
                  <th className="pb-3 text-right">分值</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {state.scoreHistory.map(item => (
                  <tr key={item.id} className="text-sm">
                    <td className="py-2 text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          item.type === 'penalty'
                            ? 'bg-red-900/50 text-red-400'
                            : item.type === 'efficiency'
                            ? 'bg-blue-900/50 text-blue-400'
                            : 'bg-green-900/50 text-green-400'
                        }`}
                      >
                        {item.value >= 0 ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                        {item.type === 'order_complete' && '订单'}
                        {item.type === 'efficiency' && '效率'}
                        {item.type === 'penalty' && '扣分'}
                        {item.type === 'bonus' && '奖励'}
                      </span>
                    </td>
                    <td className="py-2 text-white">{item.description}</td>
                    <td className={`py-2 text-right font-mono ${item.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.value >= 0 ? '+' : ''}
                      {item.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {state.anomalies.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              异常记录
            </h3>
            <div className="space-y-3">
              {state.anomalies.map(anomaly => (
                <div
                  key={anomaly.id}
                  className="flex items-start justify-between p-3 bg-red-900/20 border border-red-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-white text-sm">{anomaly.message}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-red-400 font-medium">-{anomaly.penalty}分</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
          <button
            onClick={() => navigate(`/replay/${gameId}`)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            查看回放
          </button>
          <button
            onClick={exportToCSV}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            导出CSV
          </button>
        </div>
      </div>
    </div>
  );
}
