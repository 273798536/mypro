import { Trophy, Users, Clock, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Dashboard() {
  const {
    contestants,
    currentRanking,
    pendingTieBreaks,
    appeals,
    rankingVersions,
    changeLogs,
    currentRule,
    loadSampleData,
    contestants: contestantsList,
    getContestantById,
  } = useAppStore();

  const pendingTieCount = pendingTieBreaks.filter((g) => g.status === 'pending').length;
  const pendingAppealCount = appeals.filter((a) => a.status === 'pending').length;

  const topRankings = currentRanking.slice(0, 5);
  const recentLogs = changeLogs.slice(-5).reverse();

  const stats = [
    { label: '参赛选手', value: contestants.length, icon: Users, color: 'bg-blue-500' },
    { label: '待确认同分', value: pendingTieCount, icon: Clock, color: 'bg-amber-500' },
    { label: '待处理申诉', value: pendingAppealCount, icon: AlertTriangle, color: 'bg-red-500' },
    { label: '排名版本', value: rankingVersions.length, icon: FileText, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 mt-1">
            当前规则: {currentRule.name} | {format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}
          </p>
        </div>
        {contestants.length === 0 && (
          <button
            onClick={loadSampleData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            加载样例数据
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            当前排名 TOP 5
          </h2>
          {topRankings.length > 0 ? (
            <div className="space-y-3">
              {topRankings.map((entry, index) => {
                const contestant = getContestantById(entry.contestantId);
                const rankColors = ['bg-amber-400', 'bg-slate-400', 'bg-amber-700', 'bg-slate-300', 'bg-slate-300'];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${rankColors[index]} flex items-center justify-center text-white font-bold text-sm`}
                      >
                        {entry.rank}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{contestant?.name || '未知'}</p>
                        <p className="text-xs text-slate-500">{contestant?.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{entry.score.toFixed(2)}</p>
                      {entry.isTied && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          同分
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">暂无数据，请加载样例数据</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">最近操作</h2>
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-blue-400 pl-3 py-1">
                  <p className="text-sm text-slate-700 line-clamp-2">{log.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(log.timestamp), 'MM-dd HH:mm', { locale: zhCN })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">暂无操作记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
