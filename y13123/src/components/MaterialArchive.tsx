import { useState } from 'react';
import { Archive, FileText, Ban, StickyNote } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

type TabKey = 'problems' | 'withdrawn' | 'addendum';

export default function MaterialArchive() {
  const [tab, setTab] = useState<TabKey>('problems');
  const problems = useAppStore((s) => s.problems);
  const withdrawn = useAppStore((s) => s.withdrawn);
  const addendum = useAppStore((s) => s.addendum);

  const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
    { key: 'problems', label: '题目样例', icon: FileText },
    { key: 'withdrawn', label: '撤回记录', icon: Ban },
    { key: 'addendum', label: '后补说明', icon: StickyNote },
  ];

  const sampleProblems = problems.slice(0, 3);

  return (
    <div className="paper-card rounded-xl p-4 animate-fadeSlideUp" style={{ animationDelay: '320ms' }}>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-[14px] text-ink-900">
          <Archive className="h-4 w-4 text-ink-800" />
          材料归档
          <span className="ml-1 rounded-full bg-ink-900/10 px-1.5 py-0.5 font-mono-data text-[10px] text-ink-900">
            量少也要像真活
          </span>
        </h3>
        <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] transition-all',
                tab === t.key
                  ? 'bg-white text-ink-900 shadow-inner'
                  : 'text-slateData-500 hover:text-ink-900'
              )}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[170px]">
        {tab === 'problems' && (
          <div className="space-y-1.5">
            {sampleProblems.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-gold-700/20 bg-white px-3 py-2 text-[12px]"
              >
                <span className="font-mono-data text-[10.5px] text-slateData-500 w-[78px]">
                  {p.id}
                </span>
                <span className="font-display text-ink-900">
                  {p.start} → {p.end}
                </span>
                <span className="ml-auto font-mono-data text-slateData-700">
                  {p.distance} {p.unit || '待补'}
                </span>
                {p.remark && (
                  <span className="hidden w-[220px] truncate text-[11px] text-slateData-500 md:inline">
                    {p.remark}
                  </span>
                )}
              </div>
            ))}
            <p className="pt-1 text-center text-[10.5px] text-slateData-500">
              （以上为样例摘录，完整 {problems.length} 条见左侧题目清单）
            </p>
          </div>
        )}

        {tab === 'withdrawn' && (
          <div className="space-y-2">
            {withdrawn.map((w) => (
              <div
                key={w.id}
                className="relative overflow-hidden rounded-lg border border-slateData-300/60 bg-slateData-300/10 px-3 py-2.5"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-slateData-500" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="line-through text-[12px] text-slateData-700">
                      {w.title}
                    </div>
                    <div className="mt-0.5 font-mono-data text-[10.5px] text-slateData-500">
                      {w.withdrawnAt} · {w.operator}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slateData-500/20 px-2 py-0.5 text-[10px] text-slateData-700">
                    已撤回
                  </span>
                </div>
                <p className="mt-1.5 rounded bg-white/70 px-2 py-1 text-[11.5px] leading-snug text-slateData-700">
                  撤回事由：{w.reason}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'addendum' && (
          <div className="space-y-2">
            {addendum.map((a) => (
              <div
                key={a.id}
                className="sticky-note relative rounded-md p-3 pr-8"
                style={{ transform: 'rotate(-0.8deg)' }}
              >
                <div className="absolute right-2 top-2 h-4 w-4 rotate-6 rounded-sm bg-white/70 shadow" />
                <p
                  className="font-serif text-[12.5px] leading-relaxed text-ink-900"
                  style={{ fontFamily: '"Kaiti SC", "KaiTi", "STKaiti", serif' }}
                >
                  {a.content}
                </p>
                <div className="mt-1.5 text-right text-[10.5px] text-gold-900">
                  — {a.author} · {a.addedAt}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
