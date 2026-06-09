import { useNavigate } from 'react-router-dom';
import {
  Scissors, Sparkles, ShieldAlert, AlertTriangle, FileDown,
  ChevronRight, Clock, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAppStore } from '@/store';

const taskCards = [
  { path: '/slice', title: '点云切片', desc: '剖切面参数调整、越界拦截解释、实时计算', icon: Scissors, color: 'from-blue-600 to-blue-800' },
  { path: '/outlier', title: '离群点漂浮检测', desc: '三维复核视图、每点明细、疑似原因与建议', icon: Sparkles, color: 'from-amber-600 to-amber-800' },
  { path: '/collision', title: '碰撞检测', desc: '时间轴逐帧检测、参数补录、截图联动更新', icon: ShieldAlert, color: 'from-emerald-600 to-emerald-800' },
  { path: '/anomaly', title: '异常处理中心', desc: '分类异常、明确补材料/改口径指引', icon: AlertTriangle, color: 'from-red-600 to-red-800' },
  { path: '/export', title: '报告导出', desc: '完整复核链、剖切面越界原因明细、可独立阅读', icon: FileDown, color: 'from-slate-600 to-slate-800' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { batchList, currentBatchId, outlierPoints, collisionFrames, anomalies, measurementRecords } = useAppStore();
  const current = batchList.find(b => b.id === currentBatchId);

  const unreviewedOutliers = outlierPoints.filter(p => !p.reviewed).length;
  const collisionRisks = collisionFrames.filter(f => f.hasCollision).length;
  const unresolvedAnomalies = anomalies.filter(a => !a.resolved).length;

  const stats = [
    { label: '待复核离群点', value: unreviewedOutliers, total: outlierPoints.length, icon: Sparkles, warn: unreviewedOutliers > 0, color: 'amber' },
    { label: '碰撞风险帧', value: collisionRisks, total: collisionFrames.length, icon: ShieldAlert, warn: collisionRisks > 0, color: 'red' },
    { label: '未处理异常', value: unresolvedAnomalies, total: anomalies.length, icon: AlertCircle, warn: unresolvedAnomalies > 0, color: 'orange' },
    { label: '测量记录', value: measurementRecords.length, total: measurementRecords.length, icon: CheckCircle2, warn: false, color: 'emerald' },
  ];

  return (
    <div className="h-full overflow-auto p-6">
      {current && (
        <div className="mb-6 industrial-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">当前处理批次</div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl text-slate-100">{current.materialCode}</span>
                <span className="text-slate-400">—</span>
                <span className="text-slate-200">{current.name}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                创建于 {current.createdAt}
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-industrial text-sm font-medium ${
              current.status === 'completed' ? 'bg-pass-green/20 text-pass-green border border-pass-green/40' :
              current.status === 'reviewed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
              'bg-alert-orange/20 text-alert-orange border border-alert-orange/40'
            }`}>
              {current.status === 'completed' ? '已完成' : current.status === 'reviewed' ? '已复核' : '处理中'}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {stats.map(s => {
              const Icon = s.icon;
              const warnBg = s.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                             s.color === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                             s.color === 'orange' ? 'bg-orange-500/10 text-alert-orange border-alert-orange/30' :
                             'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              return (
                <div key={s.label} className={`flex items-center gap-3 p-3 rounded-industrial border ${warnBg}`}>
                  <Icon className={`w-5 h-5 ${s.warn ? 'animate-pulse' : ''}`} />
                  <div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                    <div className="font-mono text-lg">
                      {s.value}
                      {s.total > 0 && <span className="text-slate-500 text-sm"> / {s.total}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-3 text-xs text-slate-500 uppercase tracking-wide px-1">核心任务入口</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {taskCards.map(task => {
          const Icon = task.icon;
          return (
            <button
              key={task.path}
              onClick={() => navigate(task.path)}
              className="industrial-card p-5 text-left hover:border-slate-400 hover:shadow-xl hover:shadow-black/30 transition-all group"
            >
              <div className={`w-12 h-12 rounded-industrial bg-gradient-to-br ${task.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-100">{task.title}</h3>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{task.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 industrial-card p-5">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">同批次复核链（三维模型 · 测量记录 · 离群点）</div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-industrial-700 rounded-industrial">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-slate-300">三维模型点云：{useAppStore.getState().pointCloud ? '已加载' : '未加载'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-industrial-700 rounded-industrial">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-slate-300">测量记录：{measurementRecords.length} 条</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-industrial-700 rounded-industrial">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <span className="text-slate-300">离群点：{outlierPoints.length} 个</span>
          </div>
          <div className="text-xs text-slate-500 ml-4">→ 以上数据已纳入本次同一轮复核</div>
        </div>
      </div>
    </div>
  );
}
