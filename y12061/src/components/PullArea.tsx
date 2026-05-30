import { useGachaStore } from '@/store/useGachaStore';
import { RARITY_COLORS } from '@/utils/gachaEngine';
import { cn } from '@/lib/utils';
import { Sparkles, Zap, X, RotateCcw, Copy } from 'lucide-react';
import PityRing from './PityRing';
import RarityBadge from './RarityBadge';

export default function PullArea() {
  const { cardPool, session, lastPullResults, showResult, pull, closeResult, resetSession } = useGachaStore();

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-gacha-border bg-gacha-card p-6">
        <Sparkles className="h-10 w-10 text-gacha-gold animate-pulse" />
        <p className="text-sm text-slate-400">请先在左侧配置卡池并开始实验</p>
      </div>
    );
  }

  const srRemaining = Math.max(cardPool.srHardPity - session.srPityCounter, 0);

  return (
    <div className="flex h-full flex-col items-center gap-5 rounded-xl border border-gacha-border bg-gacha-card p-6">
      <PityRing
        current={session.ssrPityCounter}
        max={cardPool.hardPity}
        softStart={cardPool.softPityStart}
      />

      <div className="flex items-center gap-2 rounded-lg border border-gacha-border bg-gacha-bg px-3 py-1.5">
        <span className="text-xs text-slate-400">SR 保底</span>
        <span className="font-display text-sm font-bold text-purple-400">
          {session.srPityCounter}<span className="text-slate-500">/{cardPool.srHardPity}</span>
        </span>
        <span className="text-[10px] text-slate-500">还剩 {srRemaining} 抽</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => pull(1)}
          className="flex items-center gap-1.5 rounded-lg border border-gacha-gold/50 bg-gacha-gold/10 px-5 py-2.5 font-display text-sm font-bold text-gacha-gold transition-all hover:bg-gacha-gold/20 animate-pulse-glow"
        >
          <Zap className="h-4 w-4" /> 单抽
        </button>
        <button
          onClick={() => pull(10)}
          className="flex items-center gap-1.5 rounded-lg border border-gacha-gold/50 bg-gacha-gold/10 px-5 py-2.5 font-display text-sm font-bold text-gacha-gold transition-all hover:bg-gacha-gold/20 animate-pulse-glow"
        >
          <Sparkles className="h-4 w-4" /> 十连抽
        </button>
      </div>

      <button
        onClick={resetSession}
        className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        <RotateCcw className="h-3 w-3" /> 重置会话
      </button>

      {showResult && lastPullResults.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative flex max-h-[80vh] flex-col items-center gap-4 overflow-y-auto p-6">
            <button
              onClick={closeResult}
              className="absolute -top-2 -right-2 rounded-full border border-gacha-border bg-gacha-card p-1 text-slate-400 transition-colors hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {lastPullResults.map((record, i) => {
                const colors = RARITY_COLORS[record.cardRarity];
                return (
                  <div
                    key={record.id}
                    className={cn(
                      'flex w-36 flex-col items-center gap-2 rounded-xl border p-3 animate-card-reveal',
                      colors.border,
                      colors.bg,
                    )}
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                  >
                    <RarityBadge rarity={record.cardRarity} size="sm" />
                    <span className={cn('text-center text-xs font-bold', colors.text)}>
                      {record.cardName}
                    </span>
                    {record.isDuplicate && (
                      <span className="flex items-center gap-0.5 text-[10px] text-rose-400">
                        <Copy className="h-2.5 w-2.5" /> {record.duplicateConversion}
                      </span>
                    )}
                    <span className="text-center text-[10px] text-slate-400 leading-tight">
                      {record.triggerReason.length > 20
                        ? record.triggerReason.slice(0, 20) + '...'
                        : record.triggerReason}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
