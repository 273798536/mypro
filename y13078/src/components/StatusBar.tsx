import { useAppStore } from '@/store/useAppStore';
import { Image, MapPin, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function StatusBar() {
  const {
    selectedPointId, activeViewId, views, points, overlaps,
  } = useAppStore();
  const activeView = views.find(v => v.id === activeViewId);
  const normal = points.filter(p => !p.withdrawn && p.status === 'normal').length;
  const warn = points.filter(p => !p.withdrawn && p.status === 'warning').length;
  const err = points.filter(p => !p.withdrawn && p.status === 'error').length;
  const total = points.filter(p => !p.withdrawn).length;
  const latestTs = points.reduce((m, p) => Math.max(m, p.updatedAt), 0);

  return (
    <div className="h-6 px-4 border-t border-cold-border bg-slate-900/80 flex items-center justify-between text-[10px] font-mono-data text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Image className="w-3 h-3 text-cold-accent" />
          {activeView ? activeView.name : '自定义视角'}
        </span>
        <span className="w-px h-3 bg-slate-700" />
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          选中：<span className="text-slate-200">{selectedPointId ?? '无'}</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        {overlaps.length > 0 && (
          <span className="flex items-center gap-1 text-cold-danger">
            <AlertTriangle className="w-3 h-3" /> 重叠 {overlaps.length}组
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-cold-success" />
          正常 {normal}
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-cold-warning" />
          预警 {warn}
        </span>
        <span className="flex items-center gap-1.5">
          <XCircle className="w-3 h-3 text-cold-danger" />
          故障 {err}
        </span>
        <span className="w-px h-3 bg-slate-700" />
        <span>有效点位 {total}</span>
        <span className="w-px h-3 bg-slate-700" />
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          数据版本 {formatTs(latestTs)}
        </span>
      </div>
    </div>
  );
}

function formatTs(ts: number): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
