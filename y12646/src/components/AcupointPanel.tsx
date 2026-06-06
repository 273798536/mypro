import { X, MapPin, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { Acupoint } from '@/types';

interface Props {
  acupoint: Acupoint;
  onClose: () => void;
}

function severityBadge(s: string) {
  if (s === 'high') return 'badge-danger';
  if (s === 'medium') return 'badge-warning';
  return 'badge-info';
}
const severityLabel: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const typeLabel: Record<string, string> = {
  collision: '碰撞边界',
  position_error: '定位偏差',
  missing_data: '数据缺失',
  unit_error: '单位错误',
};

export default function AcupointPanel({ acupoint, onClose }: Props) {
  const { batch, setSelectedAcupoint } = useAppStore();

  const relatedTrajectories = batch.trajectories.filter(
    (t) => t.acupointId === acupoint.id
  );
  const relatedAnomalies = batch.anomalies.filter(
    (a) => a.trajectoryId && relatedTrajectories.some((t) => t.id === a.trajectoryId)
  );

  const avgAccuracy =
    relatedTrajectories.length > 0
      ? Math.round(
          relatedTrajectories.reduce((s, t) => s + t.accuracy, 0) /
            relatedTrajectories.length *
            100
        )
      : 0;

  return (
    <div className="w-80 shrink-0 bg-white border-l border-ink-100 flex flex-col h-full animate-slide-up">
      <div className="p-4 border-b border-ink-100 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-ink-900">
              {acupoint.name}
            </h3>
            {acupoint.alias && (
              <span className="text-sm text-ink-400">· {acupoint.alias}</span>
            )}
          </div>
          <div className="text-xs text-medical-600 mt-1">{acupoint.meridian}</div>
        </div>
        <button
          onClick={() => {
            onClose();
            setSelectedAcupoint(null);
          }}
          className="w-8 h-8 rounded-lg hover:bg-ink-50 flex items-center justify-center text-ink-400 hover:text-ink-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area p-4 space-y-5">
        <section>
          <SectionTitle icon={MapPin} text="位置信息" />
          <div className="mt-2 p-3 rounded-xl bg-medical-50/60 border border-medical-100/60 text-sm">
            <p className="text-ink-700 leading-relaxed">
              {acupoint.description}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs font-mono text-ink-500">
              <span>X: {acupoint.position.x.toFixed(0)}px</span>
              <span>Y: {acupoint.position.y.toFixed(0)}px</span>
            </div>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="训练次数" value={relatedTrajectories.length} />
            <StatCard label="平均准确率" value={`${avgAccuracy}%`} accent={avgAccuracy >= 80 ? 'good' : avgAccuracy >= 65 ? 'warn' : 'bad'} />
          </div>
        </section>

        <section>
          <SectionTitle icon={BookOpen} text="主治病症" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {acupoint.indications.map((ind) => (
              <span
                key={ind}
                className="px-2.5 py-1 rounded-full text-xs bg-sage-50 text-sage-700 border border-sage-100"
              >
                {ind}
              </span>
            ))}
          </div>
        </section>

        {relatedTrajectories.length > 0 && (
          <section>
            <SectionTitle text="训练轨迹" />
            <div className="mt-2 space-y-2">
              {relatedTrajectories.map((t) => {
                const accColor =
                  t.accuracy >= 0.8 ? 'text-sage-600' : t.accuracy >= 0.65 ? 'text-warm-600' : 'text-red-600';
                const barColor =
                  t.accuracy >= 0.8 ? 'bg-sage-500' : t.accuracy >= 0.65 ? 'bg-warm-500' : 'bg-red-500';
                const barWidth = t.accuracy * 100 + '%';
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-ink-100 hover:border-medical-200 hover:bg-medical-50/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-500">操作人</span>
                      <span className="text-sm font-medium text-ink-800">{t.operator}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-ink-500">准确率</span>
                      <span className={'text-sm font-semibold tabular-nums ' + accColor}>
                        {Math.round(t.accuracy * 100)}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div
                        className={'h-full rounded-full ' + barColor}
                        style={{ width: barWidth }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {relatedAnomalies.length > 0 && (
          <section>
            <SectionTitle icon={AlertTriangle} text="异常记录" warning />
            <div className="mt-2 space-y-2">
              {relatedAnomalies.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-red-50/40 border border-red-100/70"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={severityBadge(a.severity)}>
                      {severityLabel[a.severity]}
                    </span>
                    <span className="text-xs font-medium text-ink-500">
                      {typeLabel[a.type]}
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed">
                    {a.description}
                  </p>
                  {a.changedResult && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-warm-700 bg-warm-50 px-2 py-1 rounded-md inline-flex">
                      <AlertTriangle className="w-3 h-3" />
                      此异常已改变判定结果
                    </div>
                  )}
                  {a.notes && (
                    <p className="mt-2 text-[11px] text-ink-500 italic">
                      {a.notes}
                    </p>
                  )}
                  <div className="mt-2 pt-2 border-t border-red-100/60">
                    <div className="text-[11px] text-ink-400">
                      材料来源：{a.materialSource}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="p-4 border-t border-ink-100">
        <button className="w-full btn-secondary">
          <CheckCircle2 className="w-4 h-4" />
          <span>标记已复核</span>
        </button>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  text,
  warning,
}: {
  icon?: any;
  text: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Icon && (
        <Icon
          className={`w-4 h-4 ${warning ? 'text-red-500' : 'text-medical-600'}`}
          strokeWidth={1.8}
        />
      )}
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          warning ? 'text-red-600' : 'text-ink-500'
        }`}
      >
        {text}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: 'good' | 'warn' | 'bad';
}) {
  const color =
    accent === 'good'
      ? 'text-sage-600'
      : accent === 'warn'
      ? 'text-warm-600'
      : accent === 'bad'
      ? 'text-red-600'
      : 'text-ink-900';
  return (
    <div className="p-3 rounded-xl bg-ink-50/60 border border-ink-100">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`mt-0.5 font-display text-xl font-semibold ${color}`}>
        {value}
      </div>
    </div>
  );
}
