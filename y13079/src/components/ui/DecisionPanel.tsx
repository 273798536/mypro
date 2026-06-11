import { useMemo } from 'react';
import { ChevronUp, ChevronDown, AlertCircle, CheckCircle2, Clock, User, MapPin, ClipboardList } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { DecisionType } from '@/types';
import { clsx } from 'clsx';

const TABS: { key: DecisionType; label: string; icon: typeof AlertCircle; cls: string; countCls: string }[] = [
  {
    key: 'supply',
    label: '需补材料',
    icon: AlertCircle,
    cls: 'text-dc-supply border-dc-supply/50',
    countCls: 'bg-dc-supply/20 text-dc-supply',
  },
  {
    key: 'release',
    label: '可放行',
    icon: CheckCircle2,
    cls: 'text-dc-release border-dc-release/50',
    countCls: 'bg-dc-release/20 text-dc-release',
  },
  {
    key: 'pending',
    label: '待确认',
    icon: Clock,
    cls: 'text-dc-pending border-dc-pending/50',
    countCls: 'bg-dc-pending/20 text-dc-pending',
  },
];

export function DecisionPanel() {
  const {
    decisions,
    showDecisionPanel,
    setShowDecisionPanel,
    activeDecisionTab,
    setActiveDecisionTab,
    points,
    setSelectedPointId,
  } = useStore();

  const grouped = useMemo(() => {
    const g: Record<DecisionType, typeof decisions> = { supply: [], release: [], pending: [] };
    decisions.forEach((d) => g[d.type].push(d));
    return g;
  }, [decisions]);

  const items = grouped[activeDecisionTab];
  const tabInfo = TABS.find((t) => t.key === activeDecisionTab)!;

  const getPointName = (pid: string) => points.find((p) => p.id === pid)?.name ?? '未知';

  return (
    <div
      className={clsx(
        'absolute left-1/2 -translate-x-1/2 bottom-0 z-10 w-[90%] max-w-5xl',
        'transition-all duration-300 ease-out',
        showDecisionPanel ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'
      )}
    >
      <div
        onClick={() => setShowDecisionPanel(!showDecisionPanel)}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-2.5 dc-panel border-b-0 cursor-pointer',
          activeDecisionTab === 'supply'
            ? 'border-t-2 border-t-dc-supply/60'
            : activeDecisionTab === 'release'
            ? 'border-t-2 border-t-dc-release/60'
            : 'border-t-2 border-t-dc-pending/60'
        )}
      >
        <ClipboardList size={14} className="text-dc-cold" />
        <span className="font-display text-sm font-semibold text-dc-text tracking-wide">决策输出</span>
        <div className="flex items-center gap-1.5 ml-2">
          {TABS.map((t) => (
            <span
              key={t.key}
              className={clsx(
                'dc-tag !py-0',
                activeDecisionTab === t.key ? t.countCls : 'text-dc-text-mute border-dc-border'
              )}
            >
              <t.icon size={10} />
              {grouped[t.key].length}
            </span>
          ))}
        </div>
        <span className="ml-auto text-[10px] font-mono text-dc-text-mute">
          方案经理：小赵 · 待审批
        </span>
        {showDecisionPanel ? (
          <ChevronDown size={16} className="text-dc-text-mute" />
        ) : (
          <ChevronUp size={16} className="text-dc-text-mute" />
        )}
      </div>

      <div className="dc-panel border-t-0 rounded-t-none">
        <div className="flex border-b border-dc-border">
          {TABS.map((t) => {
            const active = activeDecisionTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveDecisionTab(t.key)}
                className={clsx(
                  'flex-1 px-4 py-2.5 flex items-center justify-center gap-2 transition-all',
                  'border-b-2 text-xs font-display font-semibold tracking-wide',
                  active
                    ? `${t.cls} border-current bg-current/5`
                    : 'text-dc-text-mute border-transparent hover:text-dc-text-dim'
                )}
              >
                <t.icon size={13} />
                {t.label}
                <span className={clsx('dc-tag !py-0', active ? t.countCls : 'bg-dc-bg text-dc-text-mute border-dc-border')}>
                  {grouped[t.key].length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="h-[200px] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-dc-text-mute text-xs font-mono">
              暂无{tabInfo.label}项
            </div>
          ) : (
            <div className="grid gap-1.5">
              {items.map((d, idx) => (
                <div
                  key={d.id}
                  className={clsx(
                    'p-2.5 rounded-sm border flex items-start gap-3 transition-colors',
                    'bg-dc-bg-2/50 hover:bg-dc-bg-2',
                    activeDecisionTab === 'supply'
                      ? 'border-dc-supply/20 hover:border-dc-supply/40'
                      : activeDecisionTab === 'release'
                      ? 'border-dc-release/20 hover:border-dc-release/40'
                      : 'border-dc-pending/20 hover:border-dc-pending/40'
                  )}
                >
                  <span className="text-[10px] font-mono text-dc-text-mute pt-0.5 w-6 flex-shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <button
                    onClick={() => setSelectedPointId(d.pointId)}
                    className="dc-tag !py-0 flex-shrink-0 self-start hover:border-dc-cold hover:text-dc-cold"
                  >
                    <MapPin size={10} />
                    {getPointName(d.pointId)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-dc-text leading-snug">
                      {d.description}
                    </div>
                    <div
                      className={clsx(
                        'mt-1 text-[10px] font-mono leading-relaxed',
                        activeDecisionTab === 'supply'
                          ? 'text-dc-supply/90'
                          : activeDecisionTab === 'release'
                          ? 'text-dc-release/90'
                          : 'text-dc-pending/90'
                      )}
                    >
                      ▶ {d.actionText}
                    </div>
                  </div>
                  {d.owner && (
                    <div className="flex-shrink-0 flex items-center gap-1 text-[10px] font-mono text-dc-text-mute">
                      <User size={10} />
                      {d.owner}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
