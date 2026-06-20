import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, TriangleAlert, GitCompare, Clock,
  ChevronRight, Activity, BarChart3, ShieldAlert, ArrowUpRight
} from 'lucide-react';
import { CardShell } from '@/components/layout/CardShell';
import { WarningBanner } from '@/components/features/WarningBanner';
import { TimelineAxis } from '@/components/timeline/TimelineAxis';
import { useFailureStore } from '@/stores/failureStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useFeatureStore } from '@/stores/featureStore';
import { useCompareStore } from '@/stores/compareStore';
import { timeAgo } from '@/utils/time';

const StatCard: React.FC<{
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; accent: 'amber' | 'danger' | 'emerald' | 'info';
  to?: string; animate?: boolean;
}> = ({ icon: Icon, label, value, sub, accent, to, animate }) => {
  const colorMap = {
    amber: 'from-amber/25 to-amber/5 border-amber/40 text-amber',
    danger: 'from-danger/25 to-danger/5 border-danger/40 text-danger',
    emerald: 'from-emerald/25 to-emerald/5 border-emerald/40 text-emerald',
    info: 'from-info/25 to-info/5 border-info/40 text-info'
  };
  const glow = {
    amber: 'glow-ring-amber',
    danger: 'glow-ring-red',
    emerald: 'glow-ring-emerald',
    info: ''
  };
  const content = (
    <div className={`card-surface p-5 border bg-gradient-to-br ${colorMap[accent]} ${glow[accent]} relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform duration-200 ease-out`}>
      <div className="absolute inset-0 bg-grid-fade opacity-30 pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
          <div className={`mt-2 text-[34px] font-bold font-mono ${animate ? 'animate-count-pop' : ''} text-primary`}>
            {value}
          </div>
          {sub && <div className="mt-1 text-[11px] opacity-70">{sub}</div>}
        </div>
        <div className={`w-11 h-11 rounded-xl bg-root/50 border border-current flex items-center justify-center ${animate ? 'animate-pulse-amber' : ''}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>
      {to && (
        <div className="relative mt-4 flex items-center gap-1 text-[11px] font-semibold opacity-90">
          查看详情 <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to} className="block">{content}</Link> : content;
};

const DashboardPage: React.FC = () => {
  const fStore = useFailureStore();
  const tStore = useTimelineStore();
  const ftStore = useFeatureStore();
  const cStore = useCompareStore();

  useEffect(() => {
    fStore.init();
    tStore.init();
    ftStore.init();
    cStore.init();
  }, []);

  const criticalLogs = fStore.logs.filter(l => l.level === 'critical').length;
  const allLogs = fStore.logs.length;
  const unresolved = fStore.groups.filter(g => g.status === 'open' || g.status === 'analyzing').length;
  const recentEvents = [...tStore.filteredEvents]
    .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime())
    .slice(0, 8);

  const versions = cStore.versions;
  const prevV = versions.find(v => v.id === cStore.selectedPrevId);
  const currV = versions.find(v => v.id === cStore.selectedCurrId);

  return (
    <div className="space-y-5 p-8 max-w-[1600px] mx-auto">
      <WarningBanner mixedCount={ftStore.getMixedCount()} highRiskCount={ftStore.getHighRiskCount()} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle} label="失败日志总数" value={allLogs}
          sub={`${criticalLogs} 条严重 · ${unresolved} 组待处理`}
          accent="amber" to="/failure-queue" animate
        />
        <StatCard
          icon={TriangleAlert} label="特征迟到记录" value={ftStore.features.length}
          sub={`${ftStore.getMixedCount()} 条揉入正常结果 · ${ftStore.getHighRiskCount()} 条高风险`}
          accent="danger" to="/late-features" animate
        />
        <StatCard
          icon={GitCompare} label="版本追踪" value={`${prevV?.versionCode || '-'} → ${currV?.versionCode || '-'}`}
          sub={`${currV ? timeAgo(currV.releaseTime) + '发布' : '加载中'}`}
          accent="info" to="/compare"
        />
        <StatCard
          icon={Clock} label="时间线事件" value={tStore.events.length}
          sub={`一致 ${tStore.events.filter(e => e.isConsistent === 'consistent').length} · 待校验 ${tStore.events.filter(e => e.isConsistent !== 'consistent').length}`}
          accent="emerald" to="/timeline"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <CardShell
          accent="amber" className="xl:col-span-2"
          title={<div className="flex items-center gap-2"><Activity className="w-4 h-4 text-amber" strokeWidth={2} />失败队列主线速览</div>}
          subtitle={`${fStore.groups.length} 组异常主线，已拼接多任务关联日志`}
          actions={<Link to="/failure-queue" className="btn-operate !py-1.5 !px-3 !text-[11px]">完整追踪 <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
        >
          <div className="space-y-3">
            {fStore.groups.slice(0, 3).map((g, idx) => {
              const firstLog = fStore.logs.find(l => l.id === g.logIds[0]);
              const task = fStore.tasks.find(t => t.id === g.taskIds[0]);
              return (
                <div key={g.id} className="group flex items-start gap-3 p-3.5 rounded-xl bg-root/50 border border-border-default hover:border-amber/50 hover:bg-elevated/40 transition-all duration-200 cursor-pointer animate-stagger-in" style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="w-2.5 h-2.5 mt-1.5 shrink-0 rounded-full bg-amber animate-pulse-amber" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[13px] font-semibold text-primary">{g.title}</span>
                      <span className={`chip !text-[10px] ${
                        g.status === 'resolved' ? 'text-emerald' :
                        g.status === 'noted' ? 'text-info' :
                        g.status === 'analyzing' ? 'text-amber' : 'text-muted'
                      }`}>{g.status}</span>
                      <span className="chip !text-[10px] text-muted">{g.logIds.length} 条日志</span>
                      <span className="chip !text-[10px] text-muted">{g.taskIds.length} 个任务</span>
                    </div>
                    <div className="text-[11px] text-secondary leading-relaxed line-clamp-2">{firstLog?.message}</div>
                    {task && <div className="mt-1.5 text-[10px] font-mono text-muted">来源: {task.taskName}</div>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0 group-hover:text-amber group-hover:translate-x-1 transition-all mt-1" strokeWidth={2} />
                </div>
              );
            })}
          </div>
        </CardShell>

        <CardShell
          accent="emerald"
          title={<div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald" strokeWidth={2} />版本指标速览</div>}
          subtitle="前版与当前版核心指标对比"
          actions={<Link to="/compare" className="btn-operate !py-1.5 !px-3 !text-[11px]">对比 <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
        >
          <div className="space-y-3">
            {prevV && currV && Object.keys(currV.metrics).map((k, idx) => {
              const p = prevV.metrics[k];
              const c = currV.metrics[k];
              const d = c - p;
              return (
                <div key={k} className="animate-stagger-in" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-secondary uppercase">{k}</span>
                    <span className={`text-[10px] font-mono font-bold ${d >= 0 ? 'text-emerald' : 'text-danger'}`}>
                      {d >= 0 ? '↑' : '↓'} {(d * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <div className="h-2 rounded-full bg-root overflow-hidden border border-border-default">
                        <div
                          className="h-full bg-gradient-to-r from-emerald/40 to-emerald"
                          style={{ width: `${c * 100}%` }}
                        />
                      </div>
                      <div className="h-2 mt-1 rounded-full bg-root overflow-hidden border border-border-default opacity-60">
                        <div
                          className="h-full bg-gradient-to-r from-muted/40 to-muted"
                          style={{ width: `${p * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[13px] font-bold text-primary">{c.toFixed(3)}</div>
                      <div className="font-mono text-[10px] text-muted">{p.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardShell>
      </div>

      <CardShell
        accent="info"
        title={<div className="flex items-center gap-2"><Clock className="w-4 h-4 text-info" strokeWidth={2} />近期时间线</div>}
        subtitle="最近 8 条关键事件，完整时间线请跳转历史时间线页"
        actions={<Link to="/timeline" className="btn-operate !py-1.5 !px-3 !text-[11px]">完整时间线 <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
        bodyClassName="!py-3"
      >
        <TimelineAxis events={recentEvents} />
      </CardShell>
    </div>
  );
};

export default DashboardPage;
