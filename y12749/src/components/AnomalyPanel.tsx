import { useBatchStore } from '@/store/useBatchStore';
import type { AnomalyItem } from '@/types';
import { Package, Settings, ChevronRight, CheckCircle2 } from 'lucide-react';

function Card({
  category,
  title,
  icon: Icon,
  items,
  onResolve,
}: {
  category: 'need_material' | 'need_criteria';
  title: string;
  icon: any;
  items: AnomalyItem[];
  onResolve: (id: string) => void;
}) {
  const borderColor = category === 'need_material' ? 'border-amber-300' : 'border-navy-300';
  const accent = category === 'need_material' ? 'text-amber-600' : 'text-navy-600';
  const bgAccent = category === 'need_material' ? 'bg-amber-50' : 'bg-navy-50';

  return (
    <section className={`card-base p-4 border-l-4 ${borderColor} animate-fade-up`}>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded ${bgAccent} flex items-center justify-center`}>
            <Icon size={15} className={accent} />
          </div>
          <div>
            <h3 className="font-serif text-sm font-semibold text-navy-800">{title}</h3>
            <p className="text-[11px] text-navy-400">
              共 {items.length} 项，未处理 {items.filter((a) => !a.resolved).length}
            </p>
          </div>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-navy-400">
          <CheckCircle2 size={18} className="mx-auto mb-1 text-teal-500" />
          暂无此类异常
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li
              key={a.id}
              className={`p-3 rounded border ${a.resolved ? 'border-teal-200 bg-teal-50/40' : 'border-navy-100 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {a.resolved && <CheckCircle2 size={13} className="text-teal-500" />}
                    <h4 className={`text-xs font-semibold ${a.resolved ? 'text-teal-700 line-through' : 'text-navy-800'}`}>
                      {a.title}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-navy-500 leading-relaxed">{a.description}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                    <ChevronRight size={11} className={accent} />
                    <span className={accent}>{a.nextStep}</span>
                  </div>
                </div>
                {!a.resolved && (
                  <button
                    onClick={() => onResolve(a.id)}
                    className="flex-shrink-0 px-2 py-1 rounded text-[10px] border border-navy-200 text-navy-600 hover:bg-navy-50 transition-colors"
                  >
                    标记已处理
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AnomalyPanel() {
  const { batch, resolveAnomaly } = useBatchStore();
  const needMaterial = batch.anomalies.filter((a) => a.category === 'need_material');
  const needCriteria = batch.anomalies.filter((a) => a.category === 'need_criteria');

  return (
    <div className="grid grid-cols-2 gap-4" style={{ animationDelay: '60ms' }}>
      <Card
        category="need_material"
        title="需补材料"
        icon={Package}
        items={needMaterial}
        onResolve={resolveAnomaly}
      />
      <Card
        category="need_criteria"
        title="需改口径"
        icon={Settings}
        items={needCriteria}
        onResolve={resolveAnomaly}
      />
    </div>
  );
}
