import { Award, TrendingUp, MapPin, Ruler, Navigation, Scale } from 'lucide-react';
import { ScoreReport, ScoreItem } from '@/types';
import { cn } from '@/lib/utils';

interface ScoreCardsProps {
  report: ScoreReport;
}

const categoryIcons: Record<string, typeof Award> = {
  survey: MapPin,
  angle: Ruler,
  path: Navigation,
  unit: Scale,
};

const categoryColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  survey: {
    bg: 'bg-[#0F3460]/5',
    text: 'text-[#0F3460]',
    border: 'border-[#0F3460]/20',
    gradient: 'from-[#0F3460] to-[#1a4a8a]',
  },
  angle: {
    bg: 'bg-[#16C79A]/5',
    text: 'text-[#16C79A]',
    border: 'border-[#16C79A]/20',
    gradient: 'from-[#16C79A] to-[#12a884]',
  },
  path: {
    bg: 'bg-[#FFD93D]/5',
    text: 'text-[#b8860b]',
    border: 'border-[#FFD93D]/30',
    gradient: 'from-[#FFD93D] to-[#e6c236]',
  },
  unit: {
    bg: 'bg-[#E94560]/5',
    text: 'text-[#E94560]',
    border: 'border-[#E94560]/20',
    gradient: 'from-[#E94560] to-[#c73a52]',
  },
};

const gradeColors: Record<string, string> = {
  A: 'bg-[#16C79A]',
  B: 'bg-[#0F3460]',
  C: 'bg-[#FFD93D]',
  D: 'bg-[#f59e0b]',
  F: 'bg-[#E94560]',
};

function ScoreCard({ item, index }: { item: ScoreItem; index: number }) {
  const Icon = categoryIcons[item.category] || Award;
  const colors = categoryColors[item.category];
  const percentage = (item.score / item.maxScore) * 100;
  const hasErrors = item.errors.length > 0;

  return (
    <div
      className={cn(
        'relative p-5 rounded-xl border transition-all duration-500 hover:shadow-lg hover:-translate-y-1',
        colors.bg,
        colors.border
      )}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg bg-gradient-to-br', colors.gradient)}>
          <Icon size={18} className="text-white" />
        </div>
        {hasErrors && (
          <span className="text-xs font-medium text-[#E94560] bg-[#E94560]/10 px-2 py-0.5 rounded-full">
            {item.errors.length} 处错误
          </span>
        )}
      </div>

      <h4 className={cn('font-bold text-lg mb-1', colors.text)}>{item.categoryName}</h4>

      <div className="flex items-baseline gap-1 mb-3">
        <span className={cn('text-3xl font-bold font-orbitron', colors.text)}>
          {item.score}
        </span>
        <span className="text-sm text-[#2C3E50]/50">/ {item.maxScore}</span>
      </div>

      <div className="h-2 bg-white/50 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', colors.gradient)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-[#2C3E50]/60">
        规则参考: {item.ruleReference}
      </div>
    </div>
  );
}

export function ScoreCards({ report }: ScoreCardsProps) {
  const percentage = (report.totalScore / report.maxScore) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#0F3460] to-[#1a4a8a] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-[#FFD93D]" />
              <span className="text-sm text-white/70">总成绩</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold font-['Orbitron']">
                {report.totalScore}
              </span>
              <span className="text-2xl text-white/60">/ {report.maxScore}</span>
            </div>
            <div className="mt-2 text-sm text-white/70">
              得分率: {percentage.toFixed(1)}%
            </div>
          </div>

          <div className="text-center">
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold font-orbitron shadow-lg',
                gradeColors[report.grade]
              )}
            >
              {report.grade}
            </div>
            <div className="mt-2 text-xs text-white/70">等级评定</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {report.scoreItems.map((item, index) => (
          <ScoreCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
