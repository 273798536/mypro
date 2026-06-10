import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import StatsCard from '@/components/StatsCard';
import {
  TestTube,
  Clock,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  FilePlus2,
  Download,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
} from 'recharts';
import type { Band, ReviewLog } from '../../shared/types';

const CATEGORY_BADGE: Record<string, { label: string; classes: string }> = {
  target: { label: '目标', classes: 'bg-lab-700/10 text-lab-700' },
  nonspecific: { label: '杂带', classes: 'bg-lab-warn/10 text-lab-warn' },
  smear: { label: '拖尾', classes: 'bg-purple-100 text-purple-700' },
  missing: { label: '缺失', classes: 'bg-lab-danger/10 text-lab-danger' },
};

function getQualityColor(score: number): string {
  if (score < 50) return '#dc2626';
  if (score <= 75) return '#d97706';
  return '#059669';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    lots,
    samples,
    bands,
    reviewLogs,
    fetchAllData,
    toggleDemoMode,
    isDemoMode,
    triggerDiffRun,
    exportData,
  } = useWorkbenchStore();

  useEffect(() => {
    if (lots.length === 0) {
      fetchAllData();
    }
  }, [lots.length, fetchAllData]);

  const stats = useMemo(() => {
    const pendingCount = bands.filter((b) => b.confirm_status === 'pending').length;
    const confirmedCount = bands.filter((b) => b.confirm_status === 'confirmed').length;
    const anomalyCount = samples.filter((s) => s.is_abnormal === true).length;
    const totalBands = bands.length;
    const completionRate =
      totalBands > 0 ? Math.round((confirmedCount / totalBands) * 100) : 0;

    return {
      lotCount: lots.length,
      pendingCount,
      anomalyCount,
      completionRate: `${completionRate}%`,
    };
  }, [lots, samples, bands]);

  const qualityChartData = useMemo(() => {
    return lots.map((lot) => {
      const lotSampleIds = samples.filter((s) => s.lot_id === lot.id).map((s) => s.id);
      const lotBands = bands.filter((b) => lotSampleIds.includes(b.sample_id));
      const avgQuality =
        lotBands.length > 0
          ? Math.round((lotBands.reduce((acc: number, b: Band) => acc + b.quality_score, 0) / lotBands.length) * 10) / 10
          : 0;
      return {
        lot: lot.lot_number,
        quality: avgQuality,
      };
    });
  }, [lots, samples, bands]);

  const recentChanges = useMemo(() => {
    const changeLogs = reviewLogs
      .filter(
        (log: ReviewLog) =>
          log.action === 'change_lot' ||
          (log.old_value !== undefined && log.new_value !== undefined && log.old_value !== log.new_value)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    return changeLogs.map((log, idx) => {
      const band = bands.find((b) => b.id === log.band_id);
      const sample = samples.find((s) => s.id === band?.sample_id);
      const category = band?.label_category ?? 'target';
      return {
        id: `${log.id}-${idx}`,
        oldLabel: String(log.old_value ?? '-'),
        newLabel: String(log.new_value ?? '-'),
        category,
        sampleCode: sample?.sample_code ?? '-',
      };
    });
  }, [reviewLogs, bands, samples]);

  const scrollItems = useMemo(() => {
    const items = recentChanges.length > 0 ? recentChanges : [];
    return [...items, ...items];
  }, [recentChanges]);

  const categoryStackData = useMemo(() => {
    const categories: Record<string, { target: number; nonspecific: number; smear: number; missing: number }> = {};

    lots.forEach((lot) => {
      const key = lot.lot_number;
      categories[key] = { target: 0, nonspecific: 0, smear: 0, missing: 0 };
      const lotSampleIds = samples.filter((s) => s.lot_id === lot.id).map((s) => s.id);
      const lotBands = bands.filter((b) => lotSampleIds.includes(b.sample_id));
      lotBands.forEach((band) => {
        categories[key][band.label_category]++;
      });
    });

    return Object.entries(categories).map(([category, counts]) => ({
      category,
      target: counts.target,
      nonspecific: counts.nonspecific,
      smear: counts.smear,
      missing: counts.missing,
    }));
  }, [lots, samples, bands]);

  const handleTriggerRun = async () => {
    if (lots.length > 0) {
      try {
        await triggerDiffRun(lots[0].id, {});
      } catch (err) {
        console.error('Failed to trigger run:', err);
      }
    }
  };

  const handleExport = async () => {
    try {
      await exportData('csv', { lot_ids: lots.map((l) => l.id), include_photos: false, include_charts: false });
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  return (
    <div className="space-y-6 animate-slideIn">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-serif">总览看板</h1>
        <p className="text-sm text-slate-500 mt-1">蛋白电泳条带标注系统 · 实时数据概览</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleTriggerRun}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lab-700 text-white text-sm font-medium hover:bg-lab-800 transition-colors shadow-sm shadow-lab-700/20"
        >
          <PlayCircle className="w-4 h-4" />
          触发重复运行
        </button>
        <button
          onClick={() => navigate('/review')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
        >
          <FilePlus2 className="w-4 h-4 text-lab-supplement" />
          补录入库
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 text-lab-confirm" />
          导出结果
        </button>
        <button
          onClick={toggleDemoMode}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${
            isDemoMode
              ? 'bg-lab-danger text-white hover:bg-red-700 shadow-lab-danger/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isDemoMode ? '' : 'text-lab-warn'}`} />
          {isDemoMode ? '退出演示' : '演示模式'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="批号总数"
          value={stats.lotCount}
          icon={TestTube}
          color="blue"
          delta="本周 +2"
          deltaColor="green"
        />
        <StatsCard
          label="待确认"
          value={stats.pendingCount}
          icon={Clock}
          color="amber"
          delta="较昨日 -3"
          deltaColor="green"
        />
        <StatsCard
          label="异常样本"
          value={stats.anomalyCount}
          icon={AlertTriangle}
          color="red"
          delta="含6种场景"
          deltaColor="red"
        />
        <StatsCard
          label="完成率"
          value={stats.completionRate}
          icon={CheckCircle}
          color="green"
          delta="持续提升"
          deltaColor="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">各批号平均质量分布</h3>
          {qualityChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={qualityChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="lot"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number) => [`${value} 分`, '平均质量分']}
                  labelFormatter={(label) => `批号: ${label}`}
                />
                <ReferenceLine
                  y={70}
                  stroke="#2563eb"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: '合格阈值 70',
                    position: 'right',
                    fill: '#2563eb',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="quality" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {qualityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getQualityColor(entry.quality)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">最新差异分析改写</h3>
          {scrollItems.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              暂无差异记录
            </div>
          ) : (
            <div className="scroll-container h-64">
              <div className="scroll-content space-y-3">
                {scrollItems.map((item, idx) => {
                  const badge = CATEGORY_BADGE[item.category] ?? CATEGORY_BADGE.target;
                  return (
                    <div
                      key={`${item.id}-dup-${idx}`}
                      className="relative p-3 rounded-xl bg-slate-50/80 border border-slate-100"
                    >
                      <div className="absolute top-2 right-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pr-16">
                        <span className="flex-1 min-w-0 truncate text-sm text-slate-400 line-through">
                          {item.oldLabel}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-lab-confirm">
                          {item.newLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5 font-mono">
                        {item.sampleCode}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">分组统计总览</h3>
        {categoryStackData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={categoryStackData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value: string) => {
                  const map: Record<string, string> = {
                    target: '目标条带',
                    nonspecific: '杂带',
                    smear: '拖尾',
                    missing: '缺失',
                  };
                  return map[value] ?? value;
                }}
              />
              <Bar dataKey="target" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
              <Bar dataKey="nonspecific" stackId="a" fill="#d97706" />
              <Bar dataKey="smear" stackId="a" fill="#7c3aed" />
              <Bar dataKey="missing" stackId="a" fill="#dc2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
