import { useState } from 'react';
import { useGachaStore } from '@/store/useGachaStore';
import { cn } from '@/lib/utils';
import { History, Gem, Coins, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import RarityBadge from './RarityBadge';

export default function PullHistory() {
  const { session } = useGachaStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-gacha-border bg-gacha-card p-6">
        <Inbox className="h-8 w-8 text-slate-600" />
        <p className="text-xs text-slate-500">暂无抽卡记录</p>
      </div>
    );
  }

  const records = [...session.records].reverse();
  const ssrCount = records.filter((r) => r.cardRarity === 'SSR').length;
  const srCount = records.filter((r) => r.cardRarity === 'SR').length;

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-gacha-border bg-gacha-card p-4">
      <div className="flex items-center gap-2 border-b border-gacha-border pb-3">
        <History className="h-4 w-4 text-gacha-purple" />
        <h2 className="font-display text-sm font-bold text-slate-200">抽卡记录</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-gacha-border bg-gacha-bg p-2">
          <div className="font-display text-lg font-bold text-slate-200">{session.totalPulls}</div>
          <div className="text-[10px] text-slate-500">总抽数</div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
          <div className="font-display text-lg font-bold text-amber-400">{ssrCount}</div>
          <div className="text-[10px] text-amber-400/60">SSR</div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2">
          <div className="font-display text-lg font-bold text-purple-400">{srCount}</div>
          <div className="text-[10px] text-purple-400/60">SR</div>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-lg border border-gacha-border bg-gacha-bg p-2">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5 font-display text-sm font-bold text-cyan-400">
              <Gem className="h-3 w-3" />{session.shardCount}
            </div>
            <div className="text-[10px] text-slate-500">碎片</div>
          </div>
          <div className="h-6 w-px bg-gacha-border" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5 font-display text-sm font-bold text-gacha-gold">
              <Coins className="h-3 w-3" />{session.currencyCount}
            </div>
            <div className="text-[10px] text-slate-500">星辉币</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-600">
            <Inbox className="mb-2 h-6 w-6" />
            <span className="text-xs">暂无记录</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {records.map((record) => {
              const isExpanded = expandedId === record.id;
              return (
                <div
                  key={record.id}
                  className={cn(
                    'rounded-lg border bg-gacha-bg transition-colors cursor-pointer',
                    isExpanded ? 'border-gacha-purple/40' : 'border-transparent hover:border-gacha-border',
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="font-display text-[10px] text-slate-600 w-6 shrink-0">#{record.pullNumber}</span>
                    <RarityBadge rarity={record.cardRarity} size="sm" />
                    <span className="flex-1 truncate text-xs text-slate-300">{record.cardName}</span>
                    <div className="flex shrink-0 gap-1">
                      {record.isPity && (
                        <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] text-amber-400">保底</span>
                      )}
                      {record.isSoftPity && (
                        <span className="rounded bg-purple-500/20 px-1 py-0.5 text-[9px] text-purple-400">软保底</span>
                      )}
                      {record.isDuplicate && (
                        <span className="rounded bg-rose-500/20 px-1 py-0.5 text-[9px] text-rose-400">重复→{record.duplicateConversion}</span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                    )}
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gacha-border px-2 py-2 text-[10px] text-slate-400 leading-relaxed animate-slide-up">
                      <p><span className="text-slate-300">触发原因：</span>{record.triggerReason}</p>
                      <p className="mt-1"><span className="text-slate-300">详细说明：</span>{record.explanation}</p>
                      <p className="mt-1"><span className="text-slate-300">实际概率：</span>{(record.effectiveRate * 100).toFixed(2)}%</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
