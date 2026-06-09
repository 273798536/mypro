import { useMemo, useState } from 'react';
import { Calendar, Hash, TrendingUp } from 'lucide-react';
import type { Question, ScheduleResult } from '@/types';

interface GanttChartProps {
  questions: Question[];
  schedules: ScheduleResult[];
}

export function GanttChart({ questions, schedules }: GanttChartProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const valid = useMemo(
    () => schedules.filter((s) => !s.skipped).sort((a, b) => a.rank - b.rank),
    [schedules],
  );

  const batchColors = [
    { bg: 'bg-[#2d5a8f]', border: 'border-[#4a8ec2]', label: '第1批' },
    { bg: 'bg-[#2d7b64]', border: 'border-[#5eb897]', label: '第2批' },
    { bg: 'bg-[#8b6a2d]', border: 'border-[#d4a24c]', label: '第3批' },
    { bg: 'bg-[#7d3d5a]', border: 'border-[#c07098]', label: '第4批' },
    { bg: 'bg-[#5a4a8b]', border: 'border-[#9a8ac8]', label: '第5批' },
    { bg: 'bg-[#4a5a3d]', border: 'border-[#8fb070]', label: '第6批' },
  ];

  const maxRank = valid.length;

  return (
    <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white">
      <div className="flex items-center justify-between border-b border-[#2a4a73] px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#d4a24c]" />
          <h3 className="font-serif text-lg font-semibold">排期甘特图</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            共 {maxRank} 道题
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            {Math.max(...valid.map((s) => s.batch), 0)} 个批次
          </div>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="min-w-[720px]">
          <div className="mb-3 flex gap-2 flex-wrap">
            {Array.from(new Set(valid.map((s) => s.batch)))
              .sort((a, b) => a - b)
              .map((batch) => {
                const c = batchColors[(batch - 1) % batchColors.length];
                const date = valid.find((s) => s.batch === batch)?.publishDate || '';
                return (
                  <div
                    key={batch}
                    className={`flex items-center gap-1.5 rounded border ${c.border} ${c.bg}/30 px-2 py-1 text-xs`}
                  >
                    <span className={`h-2 w-2 rounded ${c.bg}`} />
                    <span>{c.label}</span>
                    <span className="text-gray-400">{date}</span>
                  </div>
                );
              })}
          </div>

          <div className="space-y-1.5">
            {valid.map((s, idx) => {
              const q = questions.find((q) => q.id === s.questionId);
              const c = batchColors[(s.batch - 1) % batchColors.length];
              const widthPct = Math.max(18, 100 - idx * 1.2);
              const isHover = hoverId === s.questionId;

              return (
                <div
                  key={s.questionId}
                  className={`group flex items-center gap-3 rounded px-1 py-1 transition-colors ${
                    isHover ? 'bg-[#1a2f4d]' : ''
                  }`}
                  onMouseEnter={() => setHoverId(s.questionId)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <div className="flex w-20 shrink-0 items-center gap-2">
                    <span className="w-8 text-right font-mono text-xs text-gray-500">
                      #{s.rank}
                    </span>
                    <span className="truncate font-mono text-xs text-[#d4a24c]">
                      {s.questionId}
                    </span>
                  </div>

                  <div className="relative flex-1">
                    <div
                      className={`h-8 rounded border ${c.border} ${c.bg} transition-all ${
                        isHover ? 'brightness-125 shadow-lg' : 'opacity-85'
                      }`}
                      style={{
                        width: `${widthPct}%`,
                        animationDelay: `${idx * 40}ms`,
                      }}
                    />
                    {isHover && q && (
                      <div className="absolute left-0 top-10 z-10 w-64 rounded border border-[#d4a24c] bg-[#1a2f4d] p-3 text-xs shadow-2xl">
                        <div className="mb-1 font-semibold text-white">{q.name}</div>
                        <div className="space-y-0.5 text-gray-300">
                          <div>综合评分：<span className="text-[#d4a24c]">{s.score}</span></div>
                          <div>置信度：<span className="text-[#2d936c]">{Math.round(s.confidence * 100)}%</span></div>
                          <div>批次：第{s.batch}批 · {s.publishDate}</div>
                          <div className="pt-1 text-[10px] text-gray-500">
                            D̃={s.scoreBreakdown.normalizedDifficulty} · E={s.scoreBreakdown.errorRateComponent} · P={s.scoreBreakdown.dependencyPenalty} · C={s.scoreBreakdown.chapterOrder}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-36 shrink-0 truncate text-sm text-gray-300">
                    {q?.name || s.questionId}
                  </div>

                  <div className="w-24 shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1 text-xs text-gray-400">
                      <span className={`inline-block h-2 w-2 rounded-full ${c.bg}`} />
                      {s.publishDate}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
