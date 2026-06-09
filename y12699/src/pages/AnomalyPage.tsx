import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  AlertTriangle, Database, Settings, Activity,
  FilePlus, Wand2, CheckCircle2, Circle, ArrowRight
} from 'lucide-react';

const categoryMeta: Record<string, { icon: typeof Database; color: string; label: string; bg: string }> = {
  missing_data: { icon: Database, color: 'text-blue-400', label: '缺数据', bg: 'bg-blue-500/10 border-blue-500/30' },
  param_error: { icon: Settings, color: 'text-amber-400', label: '参数错', bg: 'bg-amber-500/10 border-amber-500/30' },
  algo_limit: { icon: Activity, color: 'text-purple-400', label: '算法超限', bg: 'bg-purple-500/10 border-purple-500/30' },
};

export default function AnomalyPage() {
  const navigate = useNavigate();
  const { anomalies, markAnomalyResolved } = useAppStore();

  const categories = ['missing_data', 'param_error', 'algo_limit'];
  const unresolved = anomalies.filter(a => !a.resolved).length;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-alert-orange" />
          异常处理中心
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          异常按类别拆分展示，每条异常明确标注下一步是 <span className="text-blue-400 font-medium">补材料</span> 还是 <span className="text-amber-400 font-medium">改口径</span>。不把所有异常塞进一个红色数字。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {categories.map(cat => {
          const items = anomalies.filter(a => a.category === cat);
          const meta = categoryMeta[cat];
          const Icon = meta.icon;
          const unresolvedCount = items.filter(a => !a.resolved).length;
          return (
            <div key={cat} className={`industrial-card p-5 border ${meta.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                  <span className="font-medium text-slate-200">{meta.label}</span>
                </div>
                <div className={`font-mono text-lg ${unresolvedCount > 0 ? meta.color : 'text-slate-500'}`}>
                  {unresolvedCount}
                  <span className="text-xs text-slate-500"> / {items.length}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {cat === 'missing_data' && '材料、记录、数据缺失，下一步需补材料'}
                {cat === 'param_error' && '参数设置错误或越界，下一步需改口径'}
                {cat === 'algo_limit' && '超出算法适用范围，下一步需改口径或补材料'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {categories.map(cat => {
          const items = anomalies.filter(a => a.category === cat);
          if (items.length === 0) return null;
          const meta = categoryMeta[cat];
          const Icon = meta.icon;
          return (
            <div key={cat} className="industrial-card overflow-hidden">
              <div className={`px-5 py-3 border-b border-industrial-600 flex items-center gap-2 ${meta.bg}`}>
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                <span className="text-xs text-slate-500 ml-2">
                  {items.filter(a => !a.resolved).length} 项待处理
                </span>
              </div>
              <div className="divide-y divide-industrial-600">
                {items.map(a => {
                  const nextActionIcon = a.nextAction === '补材料' ? FilePlus : Wand2;
                  const nextActionColor = a.nextAction === '补材料' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                  const NextIcon = nextActionIcon;
                  return (
                    <div key={a.id} className={`p-5 flex items-start gap-4 ${a.resolved ? 'opacity-60' : ''}`}>
                      <button
                        onClick={() => markAnomalyResolved(a.id)}
                        className={`mt-0.5 ${a.resolved ? 'text-pass-green' : 'text-slate-500 hover:text-pass-green'}`}
                      >
                        {a.resolved ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <div className="flex-1">
                        <div className="text-sm text-slate-200 leading-relaxed mb-3">
                          {a.description}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-industrial border text-xs font-medium ${nextActionColor}`}>
                            <NextIcon className="w-3.5 h-3.5" />
                            下一步：{a.nextAction}
                          </div>
                          {a.resolved && (
                            <span className="text-xs text-pass-green flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> 已处理
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">异常编号</div>
                        <div className="font-mono text-xs text-slate-400">{a.id.toUpperCase()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {anomalies.length === 0 && (
          <div className="industrial-card p-16 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-pass-green/50" />
            <div className="text-sm">当前批次无异常</div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => navigate('/export')}
          className={`industrial-btn-primary flex items-center gap-2 ${unresolved > 0 ? 'opacity-60' : ''}`}
        >
          生成导出报告
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
