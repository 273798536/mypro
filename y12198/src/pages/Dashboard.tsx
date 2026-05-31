import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, XCircle, ArrowRight, TrendingUp, Users, FileWarning } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getIssueTypeLabel, getSeverityLabel } from '@/utils/reconciliation';

export default function Dashboard() {
  const navigate = useNavigate();
  const { parts, issues, latestVersion, buildTrace } = useStore();

  const stats = {
    total: parts.length,
    confirmed: parts.filter(p => p.status === 'confirmed').length,
    distributed: parts.filter(p => p.status === 'distributed').length,
    outdated: parts.filter(p => p.status === 'outdated').length,
    pending: parts.filter(p => p.status === 'pending').length,
  };

  const syncRate = ((stats.confirmed + stats.distributed) / stats.total * 100).toFixed(1);
  const unresolvedIssues = issues.filter(i => !i.resolved);

  const statCards = [
    { label: '总声部', value: stats.total, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { label: '已确认', value: stats.confirmed, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
    { label: '待确认', value: stats.distributed, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
    { label: '版本过时', value: stats.outdated, icon: XCircle, color: 'from-red-500 to-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-slate-800">分析看板</h2>
          <p className="text-sm text-slate-500 mt-1">当前曲谱版本: <span className="font-semibold text-slate-700">{latestVersion}</span></p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp size={16} className="text-emerald-500" />
          <span className="text-slate-600">同步完成率</span>
          <span className="text-xl font-bold text-emerald-600">{syncRate}%</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                <Icon size={20} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileWarning size={18} className="text-amber-500" />
              <h3 className="font-semibold text-slate-800">对账问题清单</h3>
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">{unresolvedIssues.length} 未解决</span>
            </div>
            <button
              onClick={() => navigate('/parts')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              查看全部 <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {unresolvedIssues.slice(0, 6).map(issue => {
              const part = parts.find(p => p.id === issue.partId);
              return (
                <div
                  key={issue.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      issue.severity === 'high' ? 'bg-red-500' :
                      issue.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{part?.name || '未知声部'}</p>
                      <p className="text-xs text-slate-500">{issue.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      issue.severity === 'high' ? 'bg-red-100 text-red-600' :
                      issue.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {getSeverityLabel(issue.severity)}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                      {getIssueTypeLabel(issue.type)}
                    </span>
                    <button
                      onClick={() => {
                        buildTrace(issue.partId);
                        navigate('/trace');
                      }}
                      className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                      title="追溯"
                    >
                      <ArrowRight size={14} className="text-slate-500" />
                    </button>
                  </div>
                </div>
              );
            })}
            {unresolvedIssues.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle size={40} className="mx-auto mb-2 text-emerald-500" />
                <p>所有声部对账无误！</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">声部状态分布</h3>
          <div className="space-y-4">
            {[
              { label: '已确认', value: stats.confirmed, color: 'bg-emerald-500', total: stats.total },
              { label: '已发放待确认', value: stats.distributed, color: 'bg-amber-500', total: stats.total },
              { label: '版本过时', value: stats.outdated, color: 'bg-red-500', total: stats.total },
              { label: '待发放', value: stats.pending, color: 'bg-slate-400', total: stats.total },
            ].map(({ label, value, color, total }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-medium text-slate-800">{value} / {total}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${(value / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <AlertTriangle size={14} className="text-amber-500" />
              <span>建议优先处理高严重性问题</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
