import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import type { ReviewStatus } from '@/types';
import { ChevronRight } from 'lucide-react';

type CardKey = 'direct_use' | 'need_review' | 'rejected' | 'pending';

interface CardConfig {
  key: CardKey;
  label: string;
  emoji: string;
  description: string;
  navigateTo: string;
  gradient: string;
  ringColor: string;
  textColor: string;
  conicBg: string;
}

const CARDS: CardConfig[] = [
  {
    key: 'direct_use',
    label: '直接可用',
    emoji: '✅',
    description: '高分高置信，可直接使用',
    navigateTo: '/confidence',
    gradient: 'from-emerald-500/30 via-emerald-600/20 to-emerald-700/10',
    ringColor: 'ring-emerald-400/40',
    textColor: 'text-emerald-200',
    conicBg: '#10B981',
  },
  {
    key: 'need_review',
    label: '需找标注负责人复核',
    emoji: '⚠️',
    description: '高分低置信，需人工复核',
    navigateTo: '/correction',
    gradient: 'from-amber-500/30 via-amber-600/20 to-amber-700/10',
    ringColor: 'ring-amber-400/40',
    textColor: 'text-amber-200',
    conicBg: '#F59E0B',
  },
  {
    key: 'rejected',
    label: '不合格',
    emoji: '❌',
    description: '低分高置信，标记不合格',
    navigateTo: '/safety-rules',
    gradient: 'from-rose-500/30 via-rose-600/20 to-rose-700/10',
    ringColor: 'ring-rose-400/40',
    textColor: 'text-rose-200',
    conicBg: '#F43F5E',
  },
  {
    key: 'pending',
    label: '需补测',
    emoji: '🔄',
    description: '低分低置信，需要补测',
    navigateTo: '/distribution',
    gradient: 'from-slate-500/30 via-slate-600/20 to-slate-700/10',
    ringColor: 'ring-slate-400/40',
    textColor: 'text-slate-200',
    conicBg: '#64748B',
  },
];

function MiniPie({ percent, color }: { percent: number; color: string }) {
  const deg = Math.max(0, Math.min(360, percent * 3.6));
  return (
    <div className="relative w-14 h-14 shrink-0">
      <div
        className="w-14 h-14 rounded-full"
        style={{
          background: `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.08) 0deg)`,
        }}
      />
      <div className="absolute inset-1.5 rounded-full bg-slate-800/90 flex items-center justify-center">
        <span className="text-xs font-bold text-white font-mono">
          {percent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function ConfidenceCards() {
  const navigate = useNavigate();
  const currentSamples = useAppStore((s) => s.currentSamples);

  const counts: Record<CardKey, number> = {
    direct_use: 0,
    need_review: 0,
    rejected: 0,
    pending: 0,
  };

  currentSamples.forEach((s) => {
    const status = s.reviewStatus as ReviewStatus;
    if (status in counts) counts[status]++;
  });

  const total = currentSamples.length || 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {CARDS.map((card) => {
        const count = counts[card.key];
        const percent = (count / total) * 100;

        return (
          <button
            key={card.key}
            onClick={() => navigate(card.navigateTo)}
            className={`
              group relative overflow-hidden rounded-2xl p-5 text-left
              bg-gradient-to-br ${card.gradient}
              backdrop-blur-sm ring-1 ${card.ringColor}
              transition-all duration-300 ease-out
              hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30
              active:translate-y-0 active:scale-[0.98]
            `}
          >
            <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/3 translate-x-1/3 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: card.conicBg }}
            />

            <div className="relative flex items-start gap-4">
              <div className="flex flex-col items-center gap-3">
                <span className="text-4xl leading-none drop-shadow-lg">{card.emoji}</span>
                <MiniPie percent={percent} color={card.conicBg} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`text-base font-bold ${card.textColor} truncate`}>
                    {card.label}
                  </h3>
                  <ChevronRight
                    size={18}
                    className="text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all shrink-0"
                  />
                </div>

                <div className="mb-2">
                  <span className="text-4xl font-extrabold text-white font-mono tracking-tight drop-shadow-sm">
                    {count.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/60 ml-2">/ {total.toLocaleString()}</span>
                </div>

                <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                  {card.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
