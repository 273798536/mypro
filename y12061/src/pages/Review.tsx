import { useState } from 'react';
import { useGachaStore } from '@/store/useGachaStore';
import { RARITY_COLORS } from '@/utils/gachaEngine';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
import RarityBadge from '@/components/RarityBadge';
import { cn } from '@/lib/utils';
import type { PullRecord } from '@/types';

export default function Review() {
  const { session, cardPool } = useGachaStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  if (!session || session.records.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gacha-bg">
        <AlertTriangle className="h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-500">暂无对局数据，请先进行抽卡实验</p>
        <Link
          to="/"
          className="flex items-center gap-1 rounded-lg border border-gacha-border bg-gacha-card px-4 py-2 text-sm text-slate-300 hover:border-gacha-gold/50"
        >
          <ArrowLeft className="h-4 w-4" /> 返回实验室
        </Link>
      </div>
    );
  }

  const records = session.records;
  const ssrRecords = records.filter((r) => r.cardRarity === 'SSR');
  const pityRecords = records.filter((r) => r.isPity || r.isSoftPity);
  const duplicateRecords = records.filter((r) => r.isDuplicate);

  let filtered = [...records];
  if (filterRarity !== 'all') filtered = filtered.filter((r) => r.cardRarity === filterRarity);
  if (filterType === 'pity') filtered = filtered.filter((r) => r.isPity || r.isSoftPity);
  if (filterType === 'duplicate') filtered = filtered.filter((r) => r.isDuplicate);

  function getErrorLabel(record: PullRecord): string {
    if (record.isPity) return '保底触发';
    if (record.isSoftPity) return '软保底提升';
    if (record.isDuplicate) return '重复卡折算';
    return '基础概率';
  }

  function getErrorColor(record: PullRecord): string {
    if (record.isPity) return 'text-amber-400 bg-amber-500/15';
    if (record.isSoftPity) return 'text-purple-400 bg-purple-500/15';
    if (record.isDuplicate) return 'text-rose-400 bg-rose-500/15';
    return 'text-slate-400 bg-slate-500/15';
  }

  function getImpactExplanation(record: PullRecord): string {
    if (record.isPity && record.cardRarity === 'SSR') {
      return `第 ${record.pullNumber} 抽触发了硬保底。在此之前已连续 ${record.pityCounterBefore} 抽未出 SSR，系统强制将概率提升至 100%。这一步重置了 SSR 保底计数器，后续抽数将从 0 重新累计。`;
    }
    if (record.isSoftPity) {
      return `第 ${record.pullNumber} 抽处于软保底区间（第 ${record.pityCounterBefore + 1} 抽），SSR 实际概率被提升至 ${(record.effectiveRate * 100).toFixed(2)}%，高于基础概率 ${(cardPool.ssrRate * 100).toFixed(1)}%。软保底从第 ${cardPool.softPityStart} 抽开始生效，每抽额外增加 ${(cardPool.softPityIncrement * 100).toFixed(1)}%。`;
    }
    if (record.isPity && record.cardRarity === 'SR') {
      return `第 ${record.pullNumber} 抽触发了 SR 保底，连续 ${cardPool.srHardPity} 抽未出 SR，系统强制出 SR 卡。SR 保底计数器已重置。`;
    }
    if (record.isDuplicate) {
      return `第 ${record.pullNumber} 抽获得重复卡「${record.cardName}」，按当前折算策略（${cardPool.duplicatePolicy === 'shards' ? '碎片' : cardPool.duplicatePolicy === 'currency' ? '星辉币' : '无折算'}）转化为 ${record.duplicateConversion}。重复卡不会增加图鉴收集进度。`;
    }
    return `第 ${record.pullNumber} 抽按基础概率 ${(record.effectiveRate * 100).toFixed(1)}% 获得了「${record.cardName}」(${record.cardRarity})。此抽未触发任何保底机制，保底计数器继续累加。`;
  }

  const avgSSRInterval = ssrRecords.length > 1
    ? Math.round(session.totalPulls / ssrRecords.length)
    : 0;

  return (
    <div className="flex h-screen flex-col bg-gacha-bg bg-noise">
      <header className="flex items-center gap-4 border-b border-gacha-border px-6 py-3">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-gacha-gold"
        >
          <ArrowLeft className="h-4 w-4" /> 返回实验室
        </Link>
        <h1 className="font-display text-sm font-bold tracking-wider text-gacha-purple text-shadow-glow-purple">
          REVIEW
        </h1>
        <span className="text-xs text-slate-500">回看分析 · 第 {session.id.slice(8)} 期</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-gacha-border bg-gacha-card p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" /> 总抽数
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-slate-100">{session.totalPulls}</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 text-xs text-amber-400/60">
              <Sparkles className="h-3.5 w-3.5" /> SSR 次数
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-amber-400">{ssrRecords.length}</div>
            {avgSSRInterval > 0 && <div className="mt-1 text-[10px] text-slate-500">平均 {avgSSRInterval} 抽/SSR</div>}
          </div>
          <div className="rounded-xl border border-gacha-gold/20 bg-gacha-gold/5 p-4">
            <div className="flex items-center gap-2 text-xs text-gacha-gold/60">
              <AlertTriangle className="h-3.5 w-3.5" /> 保底触发
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-gacha-gold">{pityRecords.length}</div>
            <div className="mt-1 text-[10px] text-slate-500">含软保底 {records.filter((r) => r.isSoftPity).length} 次</div>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="flex items-center gap-2 text-xs text-rose-400/60">
              <AlertTriangle className="h-3.5 w-3.5" /> 重复折算
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-rose-400">{duplicateRecords.length}</div>
            <div className="mt-1 text-[10px] text-slate-500">碎片 {session.shardCount} · 星辉币 {session.currencyCount}</div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs text-slate-400">筛选：</span>
          <div className="flex gap-1.5">
            {['all', 'SSR', 'SR', 'R'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRarity(r)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-display transition-colors',
                  filterRarity === r ? 'bg-gacha-gold/20 text-gacha-gold' : 'bg-gacha-card text-slate-500 hover:text-slate-300',
                )}
              >
                {r === 'all' ? '全部' : r}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-gacha-border" />
          <div className="flex gap-1.5">
            {[
              { key: 'all', label: '全部' },
              { key: 'pity', label: '保底相关' },
              { key: 'duplicate', label: '重复折算' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-display transition-colors',
                  filterType === f.key ? 'bg-gacha-purple/20 text-gacha-purple' : 'bg-gacha-card text-slate-500 hover:text-slate-300',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((record) => {
            const isExpanded = expandedId === record.id;
            const colors = RARITY_COLORS[record.cardRarity];
            return (
              <div
                key={record.id}
                className={cn(
                  'rounded-xl border bg-gacha-card transition-all',
                  isExpanded ? 'border-gacha-purple/40' : 'border-gacha-border hover:border-slate-600',
                )}
              >
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <span className="font-display text-xs text-slate-600">#{record.pullNumber}</span>
                  <RarityBadge rarity={record.cardRarity} size="sm" />
                  <span className={cn('flex-1 text-sm font-medium', colors.text)}>{record.cardName}</span>
                  <span className={cn('rounded px-2 py-0.5 text-[10px] font-display', getErrorColor(record))}>
                    {getErrorLabel(record)}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </div>
                {isExpanded && (
                  <div className="border-t border-gacha-border px-4 py-3 animate-slide-up">
                    <div className="mb-2 text-xs text-slate-300">
                      <span className="text-gacha-gold">触发原因：</span>{record.triggerReason}
                    </div>
                    <div className="mb-2 text-xs text-slate-300">
                      <span className="text-gacha-purple">错因解释：</span>{getImpactExplanation(record)}
                    </div>
                    <div className="flex gap-4 text-[10px] text-slate-500">
                      <span>实际概率: {(record.effectiveRate * 100).toFixed(2)}%</span>
                      <span>保底计数(抽前): {record.pityCounterBefore}</span>
                      <span>{new Date(record.timestamp).toLocaleTimeString('zh-CN')}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
