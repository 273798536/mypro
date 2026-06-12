import { CheckCircle2, AlertCircle, FileQuestion, ArrowRight } from 'lucide-react';
import { useEvidenceStore } from '@/store/evidenceStore';
import { useChartStore } from '@/store/chartStore';
import { useTraceStore } from '@/store/traceStore';
import { useParamStore } from '@/store/paramStore';
import type { EvidenceStatus } from '@/types';

const statusConfig: Record<
  EvidenceStatus,
  { bar: string; border: string; label: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }
> = {
  processed: {
    bar: 'bg-success-ink',
    border: 'border-success-ink',
    label: '✅ 已处理',
    icon: CheckCircle2,
    iconColor: 'text-success-ink',
  },
  pending: {
    bar: 'bg-late-ochre',
    border: 'border-late-ochre',
    label: '📌 待补证据',
    icon: FileQuestion,
    iconColor: 'text-late-ochre',
  },
  abnormal: {
    bar: 'bg-abnormal-brick',
    border: 'border-abnormal-brick',
    label: '⚠️ 异常',
    icon: AlertCircle,
    iconColor: 'text-abnormal-brick',
  },
};

export default function EvidenceBoard() {
  const { items, setStatus, getCounts } = useEvidenceStore();
  const { selectNode, nodes } = useChartStore();
  const { buildTraceFromNode, setRightTab, allRecords } = useTraceStore();
  const paramRows = useParamStore((s) => s.groups[s.activeGroupId].rows);
  const counts = getCounts();

  const handleJump = (target: string) => {
    const [type, id] = target.split(':');
    if (type === 'node') {
      selectNode(id);
      buildTraceFromNode(id, nodes, paramRows);
      setRightTab('trace');
    } else if (type === 'record') {
      const rec = allRecords.find((r) => r.id === id);
      if (rec && rec.relatedParamIds && rec.relatedParamIds.length > 0) {
        setRightTab('trace');
        if (nodes[0]) {
          const matchNode = nodes.find((n) => n.relatedRecordIds.includes(id));
          if (matchNode) {
            selectNode(matchNode.id);
            buildTraceFromNode(matchNode.id, nodes, paramRows);
          }
        }
      }
    }
  };

  const cycleStatus = (id: string, current: EvidenceStatus) => {
    const order: EvidenceStatus[] = ['processed', 'pending', 'abnormal'];
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    setStatus(id, next, statusConfig[next].label);
  };

  const processedItems = items.filter((i) => i.status === 'processed');
  const pendingItems = items.filter((i) => i.status === 'pending');
  const abnormalItems = items.filter((i) => i.status === 'abnormal');

  const Section = ({
    title,
    list,
    colorHint,
  }: {
    title: string;
    list: typeof items;
    colorHint: string;
  }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-4 ${colorHint} rounded-sm`} />
        <h3 className="font-serif text-[12px] font-semibold text-academic-navy">
          {title}
          <span className="ml-1.5 text-[10px] mono text-academic-navy/50">
            ({list.length})
          </span>
        </h3>
      </div>
      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="text-[11px] text-academic-navy/40 font-serif italic px-1">
            — 无条目 —
          </div>
        ) : (
          list.map((item) => {
            const cfg = statusConfig[item.status];
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                className={`panel-card bg-white border-l-4 ${cfg.border} p-2.5 rounded-sm transition-all hover:shadow-md`}
              >
                <div
                  className={`h-1 w-full ${cfg.bar} mb-2 rounded-sm`}
                  style={{ marginTop: '-10px', marginLeft: '-10px', width: 'calc(100% + 20px)' }}
                />
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.iconColor}`} />
                      <div className="font-serif text-[12px] font-semibold text-academic-navy truncate">
                        {item.title}
                      </div>
                    </div>
                    <div className="text-[10px] mono mt-1 text-academic-navy/55 leading-snug">
                      {item.summary}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-academic-navy/10">
                  <button
                    onClick={() => cycleStatus(item.id, item.status)}
                    className="flex-1 text-[10px] font-serif px-1.5 py-1 border border-academic-navy/20 hover:bg-academic-paper transition-all rounded-sm truncate"
                    title="点击切换证据状态"
                  >
                    {cfg.label}（切换）
                  </button>
                  <button
                    onClick={() => handleJump(item.jumpTarget)}
                    className="flex items-center gap-0.5 text-[10px] font-serif px-1.5 py-1 bg-academic-navy text-white hover:bg-academic-navy-deep transition-all rounded-sm"
                  >
                    跳转
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-academic-navy/10 bg-academic-paper/60">
        <div className="flex items-center justify-between text-[11px] mono text-academic-navy/70">
          <span>
            总览：{counts.processed}已处理 · {counts.pending}待补 · {counts.abnormal}异常
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full flex rounded-sm overflow-hidden border border-academic-navy/20">
          <div
            className="bg-success-ink"
            style={{ width: `${(counts.processed / items.length) * 100}%` }}
          />
          <div
            className="bg-late-ochre"
            style={{ width: `${(counts.pending / items.length) * 100}%` }}
          />
          <div
            className="bg-abnormal-brick"
            style={{ width: `${(counts.abnormal / items.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-3 py-3">
        <Section title="⚠️ 异常 / 需补充证据" list={abnormalItems} colorHint="bg-abnormal-brick" />
        <Section title="📌 待补证据 / 处理中" list={pendingItems} colorHint="bg-late-ochre" />
        <Section title="✅ 已处理 / 材料完备" list={processedItems} colorHint="bg-success-ink" />
      </div>
    </div>
  );
}
