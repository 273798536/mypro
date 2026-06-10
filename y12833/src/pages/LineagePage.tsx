import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Upload,
  FileText,
  MapPin,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Clock,
  ChevronRight,
  Dna,
  XCircle,
  Play,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import FirstVisitGuide from '@/components/FirstVisitGuide';
import {
  cn,
  getStatusBadgeClass,
  getStatusText,
  getSampleLabelColor,
  getSpeciesEmoji,
  formatDate,
} from '@/utils';

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  gradient,
  trend,
}: {
  icon: any;
  label: string;
  value: number;
  suffix?: string;
  gradient: string;
  trend?: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="card relative overflow-hidden group hover:scale-[1.02] transition-transform">
      <div className={cn('absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-15', gradient)} />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white', gradient)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-xs text-tundra-green-dark">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-3xl font-bold font-mono-data text-slate-800">
            {display}
            <span className="text-base text-slate-400 ml-1 font-normal">{suffix}</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function LineagePage() {
  const navigate = useNavigate();
  const store = useAppStore();
  const [showGuide, setShowGuide] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSpecies, setFilterSpecies] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (store.isFirstVisit && !store.isSampleDataLoaded) {
      setShowGuide(true);
    } else if (!store.isSampleDataLoaded) {
      store.loadSampleData();
    }
  }, [store.isFirstVisit, store.isSampleDataLoaded]);

  const inTransitCount = store.samples.filter(
    (s) => s.status === 'in_transit' || s.status === 'sequencing' || s.status === 'analyzing'
  ).length;
  const coldChainAlertCount = store.samples.filter(
    (s) => s.coldChainStatus === 'warning' || s.coldChainStatus === 'alert'
  ).length;
  const pendingCount = store.samples.filter((s) => s.status === 'sampled' || s.status === 'in_transit').length;
  const completedCount = store.samples.filter((s) => s.status === 'completed' || s.status === 'archived').length;

  const speciesOptions = Array.from(new Set(store.samples.map((s) => s.species)));

  const filtered = store.samples.filter((s) => {
    if (search && !s.id.toLowerCase().includes(search.toLowerCase()) &&
        !s.variety.toLowerCase().includes(search.toLowerCase()) &&
        !s.collector.includes(search)) {
      return false;
    }
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterSpecies !== 'all' && s.species !== filterSpecies) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {showGuide && <FirstVisitGuide onDismiss={() => setShowGuide(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 font-medium">首页 / 谱系追踪</div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1 font-serif-cn flex items-center gap-2">
            🧬 谱系追踪 & 样本总览
            <span className="ml-3 px-2 py-0.5 rounded bg-deep-ocean/10 text-deep-ocean text-xs font-normal border border-deep-ocean/20">
              日常入口
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            查看全量样本状态，快速发起测序导入、补录病理、回溯采样地点
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.loadSampleData()}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <Database className="w-4 h-4" />
            重置示例数据
          </button>
          <button
            onClick={() => navigate('/import-test')}
            className="btn-warning text-sm flex items-center gap-1.5"
          >
            <Play className="w-4 h-4" />
            跑一遍重复导入测试
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={LoaderCircle}
          label="在途/处理中样本"
          value={inTransitCount}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          trend="本周 +3"
        />
        <StatCard
          icon={AlertTriangle}
          label="冷链异常预警"
          value={coldChainAlertCount}
          gradient="bg-gradient-to-br from-amber-warning to-red-500"
        />
        <StatCard
          icon={Clock}
          label="待测序/待分析"
          value={pendingCount}
          gradient="bg-gradient-to-br from-purple-500 to-pink-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="已完成/归档"
          value={completedCount}
          gradient="bg-gradient-to-br from-tundra-green to-emerald-600"
          trend="本周 +5"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/sequencing')}
          className="card text-left group !p-5 hover:!shadow-card-hover"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-deep-ocean to-deep-ocean-light flex items-center justify-center shadow-card group-hover:scale-105 transition-transform">
              <Upload className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-slate-800 font-serif-cn flex items-center gap-2">
                导入测序结果
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="text-sm text-slate-500 mt-1">
                自动去重校验 → 图、表、文字三者联动整理
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/pathology')}
          className="card text-left group !p-5 hover:!shadow-card-hover"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-tundra-green to-tundra-green-dark flex items-center justify-center shadow-card group-hover:scale-105 transition-transform">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-slate-800 font-serif-cn flex items-center gap-2">
                补录病理备注 / 签发结论
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="text-sm text-slate-500 mt-1">
                病理备注与最终结论双向锚点，复盘时点一下就能跳回去
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Dna className="w-5 h-5 text-deep-ocean" />
              <h2 className="font-bold text-slate-800 font-serif-cn">样本列表</h2>
              <span className="text-xs text-slate-400">共 {filtered.length} 条</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索编号/品种/采样人"
                  className="pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean focus:ring-2 focus:ring-deep-ocean/10 w-56"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean bg-white appearance-none cursor-pointer"
                >
                  <option value="all">全部状态</option>
                  <option value="sampled">已采样</option>
                  <option value="in_transit">转运中</option>
                  <option value="sequencing">测序中</option>
                  <option value="analyzing">分析中</option>
                  <option value="completed">已完成</option>
                  <option value="archived">已归档</option>
                </select>
              </div>
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean bg-white cursor-pointer"
              >
                <option value="all">全部物种</option>
                {speciesOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header text-left">
                  <th className="px-4 py-3 font-semibold">样本编号</th>
                  <th className="px-4 py-3 font-semibold">物种/品种</th>
                  <th className="px-4 py-3 font-semibold">采样日期</th>
                  <th className="px-4 py-3 font-semibold">采样人</th>
                  <th className="px-4 py-3 font-semibold">样本状态</th>
                  <th className="px-4 py-3 font-semibold">冷链状态</th>
                  <th className="px-4 py-3 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                      <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <div>暂无匹配样本，请先载入示例数据或调整筛选条件</div>
                    </td>
                  </tr>
                )}
                {filtered.map((s, idx) => (
                  <Fragment key={s.id}>
                    <tr
                      className={cn(
                        'table-row-hover border-t border-slate-100',
                        idx % 2 === 1 && 'bg-slate-50/40'
                      )}
                      onClick={() =>
                        setExpandedRow(expandedRow === s.id ? null : s.id)
                      }
                    >
                      <td className="px-4 py-3 font-mono-data font-semibold text-deep-ocean">
                        {s.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs shadow',
                              getSampleLabelColor(s.species)
                            )}
                          >
                            {getSpeciesEmoji(s.species)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-700 text-[13px]">
                              {s.species}
                            </div>
                            <div className="text-xs text-slate-500">{s.variety}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono-data text-slate-600 text-xs">
                        {formatDate(s.samplingTime)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.collector}</td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', getStatusBadgeClass(s.status))}>
                          {getStatusText(s.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', getStatusBadgeClass(s.coldChainStatus))}>
                          {s.coldChainStatus === 'alert' && <span className="pulse-dot w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5" />}
                          {s.coldChainStatus === 'warning' && <span className="pulse-dot w-1.5 h-1.5 bg-amber-warning rounded-full mr-1.5" />}
                          {getStatusText(s.coldChainStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/sequencing');
                          }}
                          className="text-xs text-deep-ocean hover:text-deep-ocean-light underline underline-offset-2"
                        >
                          测序结果 →
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/sampling-map');
                          }}
                          className="ml-3 text-xs text-tundra-green-dark hover:text-tundra-green underline underline-offset-2"
                        >
                          采样地图 →
                        </button>
                      </td>
                    </tr>
                    {expandedRow === s.id && (
                      <tr className="bg-deep-ocean/[0.03] border-t-0">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-4 gap-4 text-xs">
                            <div>
                              <div className="text-slate-400 mb-1">关联测序轮次</div>
                              <div className="font-mono-data text-slate-700 space-y-1">
                                {store.getSequencingBySample(s.id).length === 0 ? (
                                  <span className="text-slate-400">暂无测序数据</span>
                                ) : (
                                  store.getSequencingBySample(s.id).map((r) => (
                                    <div key={r.id} className="flex items-center gap-1.5">
                                      <Dna className="w-3 h-3 text-deep-ocean" />
                                      {r.id} · {r.batchNo}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 mb-1">病理备注</div>
                              <div className="space-y-1">
                                {store.getNotesBySample(s.id).length === 0 ? (
                                  <span className="text-slate-400">无备注</span>
                                ) : (
                                  store.getNotesBySample(s.id).map((n) => (
                                    <button
                                      key={n.id}
                                      onClick={() => {
                                        store.setHighlight(n.id, 'note');
                                        navigate('/pathology#' + n.id);
                                      }}
                                      className="block text-left hover:bg-white rounded px-1.5 py-0.5 -mx-1.5"
                                    >
                                      <span className="font-mono-data text-amber-warning font-semibold">{n.id}</span>
                                      <span className="text-slate-600 ml-1 line-clamp-1">{n.content.slice(0, 20)}...</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 mb-1">最终结论</div>
                              <div className="space-y-1">
                                {store.getConclusionsBySample(s.id).length === 0 ? (
                                  <span className="text-slate-400">未签发</span>
                                ) : (
                                  store.getConclusionsBySample(s.id).map((c) => (
                                    <button
                                      key={c.id}
                                      onClick={() => {
                                        store.setHighlight(c.id, 'conclusion');
                                        navigate('/pathology#' + c.id);
                                      }}
                                      className="block text-left hover:bg-white rounded px-1.5 py-0.5 -mx-1.5"
                                    >
                                      <span className="font-mono-data text-tundra-green-dark font-semibold">{c.id}</span>
                                      <span className="text-slate-600 ml-1 line-clamp-1">{c.judgment.slice(0, 20)}...</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 mb-1">采样地点</div>
                              {(() => {
                                const loc = store.getLocationBySample(s.id);
                                if (!loc) return <span className="text-slate-400">无坐标</span>;
                                return (
                                  <div>
                                    <div className="text-slate-700 line-clamp-2">{loc.placeName}</div>
                                    <button
                                      onClick={() => navigate('/sampling-map')}
                                      className="mt-1 text-deep-ocean hover:underline flex items-center gap-1"
                                    >
                                      <MapPin className="w-3 h-3" /> 在地图查看 →
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold text-slate-800 font-serif-cn flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-warning" />
              今日待办
            </h3>
            <div className="space-y-2">
              {store.todos.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  暂无待办事项，好样的！
                </div>
              )}
              {store.todos.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-deep-ocean/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs flex items-center gap-1.5 mb-1">
                        <span
                          className={cn(
                            'badge',
                            t.priority === '高'
                              ? 'bg-red-500/15 text-red-600'
                              : t.priority === '中'
                              ? 'bg-amber-warning/15 text-amber-warning'
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {t.priority}优先级
                        </span>
                        <span className="text-slate-400">截止 {t.due}</span>
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed">{t.text}</div>
                      <div className="text-[11px] font-mono-data text-slate-400 mt-1">关联: {t.sampleId}</div>
                    </div>
                    <button
                      onClick={() => store.completeTodo(t.id)}
                      className="w-6 h-6 rounded-full border border-slate-300 shrink-0 hover:bg-tundra-green hover:border-tundra-green hover:text-white transition-colors flex items-center justify-center opacity-60 group-hover:opacity-100"
                      title="标记完成"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-deep-ocean to-deep-ocean-light text-white">
            <h3 className="font-bold font-serif-cn flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-amber-light" />
              一致性检查提示
            </h3>
            <div className="text-sm text-slate-200 space-y-2 text-xs leading-relaxed">
              <p>发现 <b className="text-amber-light">{store.todos.filter(t=>t.priority==='高').length}</b> 个高优先级事项需要处理：</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                <li>SPL-20260603-005 病理备注 <b>P-20260603-019</b> 未关联任何结论</li>
                <li>建议运行一次「重复导入测试」消除历史补录风险</li>
              </ul>
              <button
                onClick={() => navigate('/import-test')}
                className="mt-3 w-full !bg-white/15 hover:!bg-white/25 !text-white !border-white/20 btn-secondary text-xs flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                立即运行一致性校验报告
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
