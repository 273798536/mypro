import { useMemo } from 'react';
import { FileText, Calculator, Database, Paperclip, AlertTriangle, CheckCircle2, MapPin, Thermometer, Wind } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  normal: { label: '正常', cls: 'text-dc-cold border-dc-cold/40 bg-dc-cold/10' },
  overlap: { label: '对象重叠', cls: 'text-dc-anomaly border-dc-anomaly/40 bg-dc-anomaly/10' },
  bad_data: { label: '坏数据', cls: 'text-dc-error border-dc-error/40 bg-dc-error/10' },
  missing: { label: '缺失附件', cls: 'text-dc-text-mute border-dc-text-mute/40 bg-dc-text-mute/10' },
  late: { label: '晚到附件', cls: 'text-purple-400 border-purple-400/40 bg-purple-400/10' },
};

export function DetailPanel() {
  const { points, selectedPointId, setSelectedPointId } = useStore();

  const point = useMemo(
    () => points.find((p) => p.id === selectedPointId),
    [points, selectedPointId]
  );

  if (!point) {
    return (
      <div className="h-full dc-panel border-l border-dc-border flex flex-col">
        <div className="p-3 border-b border-dc-border">
          <h3 className="font-display text-sm font-semibold text-dc-text tracking-wide">复核明细</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <MapPin size={32} className="mx-auto mb-3 text-dc-text-mute opacity-50" />
            <p className="text-xs text-dc-text-mute font-mono">选择3D场景或左侧列表中的点位</p>
            <p className="text-[10px] text-dc-text-mute/60 font-mono mt-1">查看坐标、计算口径与原始数据</p>
          </div>
        </div>
      </div>
    );
  }

  const status = STATUS_LABEL[point.status] ?? STATUS_LABEL.normal;

  return (
    <div className="h-full dc-panel border-l border-dc-border flex flex-col">
      <div className="p-3 border-b border-dc-border">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold text-dc-text tracking-wide">复核明细</h3>
          <span className="ml-auto">
            <button
              onClick={() => setSelectedPointId(null)}
              className="text-[10px] text-dc-text-mute hover:text-dc-text font-mono"
            >
              关闭 ×
            </button>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-dc-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-sm bg-dc-cold/15 border border-dc-cold/40 flex items-center justify-center">
              <MapPin size={18} className="text-dc-cold" />
            </div>
            <div>
              <div className="font-display text-lg font-bold text-dc-text tracking-wide">{point.name}</div>
              <div className="text-[10px] text-dc-text-mute font-mono">{point.id}</div>
            </div>
            <span className={clsx('ml-auto dc-tag', status.cls)}>{status.label}</span>
          </div>

          {point.note && (
            <div className="p-2 bg-dc-anomaly/10 border border-dc-anomaly/30 rounded-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-dc-anomaly flex-shrink-0 mt-0.5" />
                <span className="text-[11px] text-dc-anomaly font-mono leading-relaxed">{point.note}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-b border-dc-border">
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin size={12} className="text-dc-cold" />
            <span className="text-[11px] font-display font-semibold text-dc-text tracking-wide">点位坐标</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'X', value: point.x.toFixed(3) },
              { label: 'Y', value: point.y.toFixed(3) },
              { label: 'Z', value: (point.z + 2.2).toFixed(3) },
            ].map((c) => (
              <div key={c.label} className="bg-dc-bg border border-dc-border p-2 rounded-sm">
                <div className="text-[9px] text-dc-text-mute font-mono">{c.label} (m)</div>
                <div className="text-base font-mono font-bold text-dc-cold mt-0.5">{c.value}</div>
              </div>
            ))}
          </div>
          {(point.temperature !== undefined || point.airflow !== undefined) && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {point.temperature !== undefined && (
                <div className="flex items-center gap-2 p-2 bg-dc-bg border border-dc-border rounded-sm">
                  <Thermometer size={14} className="text-dc-warm" />
                  <div>
                    <div className="text-[9px] text-dc-text-mute font-mono">温度</div>
                    <div className="text-sm font-mono font-semibold text-dc-text">{point.temperature.toFixed(1)} °C</div>
                  </div>
                </div>
              )}
              {point.airflow !== undefined && (
                <div className="flex items-center gap-2 p-2 bg-dc-bg border border-dc-border rounded-sm">
                  <Wind size={14} className="text-dc-cold" />
                  <div>
                    <div className="text-[9px] text-dc-text-mute font-mono">风量</div>
                    <div className="text-sm font-mono font-semibold text-dc-text">{Math.round(point.airflow)} m³/h</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-b border-dc-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Calculator size={12} className="text-dc-cold" />
            <span className="text-[11px] font-display font-semibold text-dc-text tracking-wide">本次计算口径</span>
          </div>
          <div className="p-3 bg-dc-bg border-l-2 border-dc-cold rounded-sm">
            <code className="text-xs font-mono text-dc-cold">{point.calcFormula}</code>
          </div>
          <p className="text-[10px] text-dc-text-mute font-mono mt-2 leading-relaxed">
            依据《数据中心设计规范 GB50174-2017》第6.3节，冷通道温度取机柜进风口100mm处平均值。
          </p>
        </div>

        <div className="p-4 border-b border-dc-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Database size={12} className="text-dc-cold" />
            <span className="text-[11px] font-display font-semibold text-dc-text tracking-wide">原始数据定位</span>
          </div>
          <div className="bg-dc-bg border border-dc-border rounded-sm overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-dc-bg-2 border-b border-dc-border">
              <span className="text-[10px] font-mono text-dc-text-dim">{point.sourceFile}</span>
              <span className="text-[10px] font-mono text-dc-cold">第 {point.sourceRow} 行</span>
            </div>
            <div className="p-2.5 font-mono text-[11px]">
              <div className="flex gap-3">
                <span className="text-dc-text-mute select-none w-6 text-right">{point.sourceRow}</span>
                <span className="text-dc-text">{point.name}</span>
                <span className="text-dc-cold">{point.x.toFixed(3)}</span>
                <span className="text-dc-cold">{point.y.toFixed(3)}</span>
                <span className="text-dc-cold">{(point.z + 2.2).toFixed(3)}</span>
                <span className={point.status === 'normal' ? 'text-dc-ok' : 'text-dc-error'}>
                  {point.status === 'normal' ? 'OK' : 'ERR'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Paperclip size={12} className="text-dc-cold" />
            <span className="text-[11px] font-display font-semibold text-dc-text tracking-wide">附件清单</span>
            <span className="ml-auto text-[10px] font-mono text-dc-text-mute">
              {point.attachments.length}/2
            </span>
          </div>
          <div className="space-y-1.5">
            {['点位坐标确认单.pdf', '现场照片.jpg'].map((name) => {
              const has = point.attachments.includes(name);
              const isLate = point.status === 'late' && !has;
              return (
                <div
                  key={name}
                  className={clsx(
                    'flex items-center gap-2 p-2 rounded-sm border transition-colors',
                    has
                      ? 'bg-dc-bg border-dc-border'
                      : isLate
                      ? 'bg-purple-500/5 border-purple-400/30'
                      : 'bg-dc-error/5 border-dc-error/30'
                  )}
                >
                  {has ? (
                    <CheckCircle2 size={14} className="text-dc-ok flex-shrink-0" />
                  ) : isLate ? (
                    <AlertTriangle size={14} className="text-purple-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="text-dc-error flex-shrink-0" />
                  )}
                  <FileText size={12} className={has ? 'text-dc-text-dim' : 'text-dc-text-mute'} />
                  <span
                    className={clsx(
                      'text-[11px] font-mono flex-1',
                      has ? 'text-dc-text' : 'text-dc-text-mute line-through'
                    )}
                  >
                    {name}
                  </span>
                  <span
                    className={clsx(
                      'text-[9px] font-mono',
                      has ? 'text-dc-ok' : isLate ? 'text-purple-400' : 'text-dc-error'
                    )}
                  >
                    {has ? '已上传' : isLate ? '晚到待补' : '缺失'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
