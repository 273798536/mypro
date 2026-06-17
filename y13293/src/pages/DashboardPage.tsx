import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Card } from '@/components/ui/Card';
import { STATUS_LABELS } from '@/types';
import type { PointStatus } from '@/types';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitMerge,
  FileText,
  ArrowRight,
  Activity,
} from 'lucide-react';

const statIcons = {
  total: MapPin,
  completed: CheckCircle2,
  evidence_needed: AlertTriangle,
  pending: Clock,
  merged: GitMerge,
};

const statColors: Record<string, string> = {
  total: 'from-slate-700 to-slate-900',
  completed: 'from-emerald-700 to-emerald-900',
  evidence_needed: 'from-amber-600 to-amber-800',
  pending: 'from-red-700 to-red-900',
  merged: 'from-slate-500 to-slate-700',
};

export default function DashboardPage() {
  const { points, notes, schemes, versionHistory, mergeRelations, filters } = useAppStore();
  const { setFilters } = useAppStore((s) => s.actions);

  const stats = useMemo(() => {
    const base: Record<string, number> = {
      total: points.length,
      completed: 0,
      evidence_needed: 0,
      pending: 0,
      merged: 0,
      processing: 0,
    };
    points.forEach((p) => {
      base[p.status] = (base[p.status] || 0) + 1;
    });
    return base;
  }, [points]);

  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: string;
      text: string;
      point_id: string;
      point_name: string;
      time: string;
      user: string;
      color: string;
    }> = [];
    notes.forEach((n) => {
      const p = points.find((pt) => pt.id === n.point_id);
      if (p) {
        activities.push({
          id: `n-${n.id}`,
          type: '备注',
          text: n.content.slice(0, 40) + (n.content.length > 40 ? '...' : ''),
          point_id: p.id,
          point_name: p.name,
          time: n.created_at,
          user: n.created_by,
          color: 'bg-blue-500',
        });
      }
    });
    versionHistory.forEach((v) => {
      const p = points.find((pt) => pt.id === v.point_id);
      if (p) {
        activities.push({
          id: `v-${v.id}`,
          type: '修改',
          text: `${v.field_name}: ${v.old_value} → ${v.new_value}`,
          point_id: p.id,
          point_name: p.name,
          time: v.changed_at,
          user: v.changed_by,
          color: 'bg-violet-500',
        });
      }
    });
    mergeRelations.forEach((m) => {
      const src = points.find((p) => p.id === m.source_point_id);
      const tgt = points.find((p) => p.id === m.target_point_id);
      if (src && tgt) {
        activities.push({
          id: `m-${m.id}`,
          type: '归并',
          text: `${src.name} → ${tgt.name}`,
          point_id: tgt.id,
          point_name: tgt.name,
          time: m.merged_at,
          user: m.merged_by,
          color: 'bg-cyan-500',
        });
      }
    });
    schemes
      .filter((s) => s.is_conflict)
      .forEach((s) => {
        const p = points.find((pt) => pt.id === s.point_id);
        if (p) {
          activities.push({
            id: `s-${s.id}`,
            type: '冲突',
            text: `方案 ${s.version} 存在版本冲突`,
            point_id: p.id,
            point_name: p.name,
            time: s.created_at,
            user: s.created_by,
            color: 'bg-amber-500',
          });
        }
      });
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);
  }, [notes, versionHistory, mergeRelations, schemes, points]);

  const handleStatClick = (status: PointStatus | 'all') => {
    setFilters({
      status: status === 'all' ? [] : [status as PointStatus],
      keyword: '',
      source: [],
      has_notes: null,
      has_screenshots: null,
      has_conflict: null,
    });
  };

  const statCards = [
    { key: 'total', label: '点位总数', value: stats.total, filter: 'all' as const },
    { key: 'completed', label: STATUS_LABELS.completed, value: stats.completed, filter: 'completed' as PointStatus },
    { key: 'evidence_needed', label: STATUS_LABELS.evidence_needed, value: stats.evidence_needed, filter: 'evidence_needed' as PointStatus },
    { key: 'pending', label: STATUS_LABELS.pending, value: stats.pending, filter: 'pending' as PointStatus },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-slate-800">总览看板</h2>
        <p className="text-sm text-slate-500 mt-1">
          一目了然掌握全部点位处理进度、最新动态与待办事项
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = statIcons[card.key as keyof typeof statIcons];
          return (
            <Link
              key={card.key}
              to="/points"
              onClick={() => handleStatClick(card.filter)}
              className="group block"
            >
              <div
                className={`p-5 rounded-sm bg-gradient-to-br ${statColors[card.key]} text-white shadow-lg transition-transform group-hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-white/70 uppercase tracking-wider">{card.label}</p>
                    <p className="text-4xl font-serif font-bold mt-2">{card.value}</p>
                  </div>
                  <Icon size={28} className="text-white/50" />
                </div>
                <div className="mt-4 flex items-center text-xs text-white/60 group-hover:text-white/90 transition-colors">
                  查看列表 <ArrowRight size={12} className="ml-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="最近动态"
          subtitle="所有点位的操作记录时间线，最新在前"
          action={
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Activity size={12} /> {recentActivity.length} 条记录
            </span>
          }
        >
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">暂无动态</div>
              ) : (
                recentActivity.map((act) => (
                  <Link
                    key={act.id}
                    to={`/points/${act.point_id}`}
                    className="flex gap-4 group"
                  >
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full ${act.color} flex items-center justify-center flex-shrink-0 ring-4 ring-white`}
                    >
                      <span className="text-[9px] text-white font-bold">
                        {act.type === '备注' ? 'N' : act.type === '修改' ? 'E' : act.type === '归并' ? 'M' : '!'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-700">{act.user}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-sm">
                          {act.type}
                        </span>
                        <span className="text-slate-400 ml-auto">
                          {new Date(act.time).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 mt-1 font-medium group-hover:text-slate-900">
                        {act.point_name}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{act.text}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="快捷操作" subtitle="常用功能入口">
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/import"
                className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-sm hover:bg-slate-50 transition-colors text-center"
              >
                <FileText size={24} className="text-slate-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">导入数据</span>
              </Link>
              <Link
                to="/merge"
                className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-sm hover:bg-slate-50 transition-colors text-center"
              >
                <GitMerge size={24} className="text-slate-600 mb-2" />
                <span className="text-sm font-medium text-slate-700">检查归并</span>
              </Link>
            </div>
          </Card>

          <Card
            title="异常提醒"
            subtitle="需要关注的问题项"
          >
            <div className="space-y-2 text-sm">
              {(() => {
                const conflictCount = schemes.filter((s) => s.is_conflict).length;
                const noNotes = points.filter(
                  (p) => !notes.some((n) => n.point_id === p.id) && p.status !== 'completed',
                ).length;
                return (
                  <>
                    {conflictCount > 0 && (
                      <Link
                        to="/points"
                        onClick={() => setFilters({ has_conflict: true })}
                        className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-sm text-amber-800 hover:bg-amber-100"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle size={14} /> 方案版本冲突
                        </span>
                        <span className="font-semibold">{conflictCount} 项</span>
                      </Link>
                    )}
                    {noNotes > 0 && (
                      <Link
                        to="/points"
                        onClick={() => setFilters({ has_notes: false })}
                        className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-sm text-slate-700 hover:bg-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <FileText size={14} /> 缺少处理备注
                        </span>
                        <span className="font-semibold">{noNotes} 项</span>
                      </Link>
                    )}
                    {conflictCount === 0 && noNotes === 0 && (
                      <div className="text-center py-4 text-slate-400 text-xs">
                        暂无异常提醒
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
