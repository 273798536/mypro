import { Filter, RotateCcw, X } from 'lucide-react';
import { useFilterStore } from '@/store/useFilterStore';
import type { ReconciliationStatus } from '@/types';
import { STATUS_LABEL } from '@/types';

const statuses: ReconciliationStatus[] = ['confirmed', 'pending', 'returned'];

export function FilterDrawer() {
  const store = useFilterStore();
  const open = store.filterDrawerOpen;

  return (
    <>
      <button
        onClick={() => store.setDrawerOpen(true)}
        className="flex items-center gap-2 rounded-sm border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-200 transition hover:border-amber-gold/60 hover:text-amber-gold"
      >
        <Filter size={15} />
        筛选条件
      </button>

      <div
        className={
          'fixed inset-0 z-40 transition-opacity duration-200 ' +
          (open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')
        }
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => store.setDrawerOpen(false)}
        />
        <aside
          className={
            'absolute left-0 top-0 z-50 flex h-full w-80 flex-col border-r border-ink-700 bg-ink-900 transition-transform duration-200 ' +
            (open ? 'translate-x-0' : '-translate-x-full')
          }
        >
          <header className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-amber-gold" />
              <h2 className="font-serif text-base font-semibold text-ink-100">筛选条件</h2>
            </div>
            <button
              onClick={() => store.setDrawerOpen(false)}
              className="rounded-sm p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-200"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                对账状态
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {statuses.map((s) => {
                  const active = store.status.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => store.toggleStatus(s)}
                      className={
                        'flex items-center justify-between rounded-sm border px-3 py-2 text-left text-sm transition-all ' +
                        (active
                          ? 'border-amber-gold/60 bg-amber-gold/10 text-amber-gold'
                          : 'border-ink-700 bg-ink-800/60 text-ink-200 hover:border-ink-500')
                      }
                    >
                      <span>{STATUS_LABEL[s]}</span>
                      <span
                        className={
                          'h-3.5 w-3.5 rounded-sm border ' +
                          (active ? 'border-amber-gold bg-amber-gold' : 'border-ink-600')
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                交易日期
              </h3>
              <div className="space-y-2">
                <input
                  type="date"
                  value={store.dateFrom || ''}
                  onChange={(e) => store.setDateFrom(e.target.value || null)}
                  className="w-full rounded-sm border border-ink-700 bg-ink-800/60 px-3 py-2 text-sm text-ink-100 focus:border-amber-gold focus:outline-none"
                />
                <div className="text-center text-xs text-ink-500">至</div>
                <input
                  type="date"
                  value={store.dateTo || ''}
                  onChange={(e) => store.setDateTo(e.target.value || null)}
                  className="w-full rounded-sm border border-ink-700 bg-ink-800/60 px-3 py-2 text-sm text-ink-100 focus:border-amber-gold focus:outline-none"
                />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                期货合约
              </h3>
              <input
                type="text"
                placeholder="如 IF2506"
                value={store.contractCode}
                onChange={(e) => store.setContractCode(e.target.value)}
                className="w-full rounded-sm border border-ink-700 bg-ink-800/60 px-3 py-2 text-sm text-ink-100 focus:border-amber-gold focus:outline-none"
              />
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                回款拆分标记
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '全部', v: null },
                  { label: '是', v: true },
                  { label: '否', v: false },
                ].map((opt) => {
                  const active = store.isPaymentSplit === opt.v;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => store.setIsPaymentSplit(opt.v)}
                      className={
                        'rounded-sm border px-2 py-2 text-sm transition-all ' +
                        (active
                          ? 'border-amber-gold/60 bg-amber-gold/10 text-amber-gold'
                          : 'border-ink-700 bg-ink-800/60 text-ink-200 hover:border-ink-500')
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <footer className="flex items-center gap-2 border-t border-ink-700 px-5 py-4">
            <button
              onClick={() => store.reset()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-ink-700 bg-ink-800 py-2 text-sm text-ink-300 transition hover:border-ink-500 hover:text-ink-100"
            >
              <RotateCcw size={14} />
              重置
            </button>
            <button
              onClick={() => store.setDrawerOpen(false)}
              className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-sm border-2 border-amber-gold bg-amber-gold/10 py-2 text-sm font-medium text-amber-gold transition hover:bg-amber-gold/20 hover:shadow-glow-amber"
            >
              应用筛选
            </button>
          </footer>
        </aside>
      </div>
    </>
  );
}
