import { useEffect } from 'react';
import { Play, RefreshCw, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { FormulaCard } from '@/components/FormulaCard';
import { GanttChart } from '@/components/GanttChart';
import { GapList } from '@/components/GapList';

export default function Dashboard() {
  const { questions, schedules, runCalculation, lastCalculatedAt, stats } = useAppStore();

  useEffect(() => {
    if (schedules.length === 0 && questions.length > 0) {
      runCalculation();
    }
  }, [questions.length, schedules.length, runCalculation]);

  const validSchedules = schedules.filter((s) => !s.skipped);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard
          label="题库总量"
          value={stats.total}
          suffix="题"
          icon={<BarChart3 className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          label="已处理排期"
          value={stats.processed}
          suffix="题"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="跳过（异常）"
          value={stats.skipped}
          suffix="题"
          icon={<XCircle className="h-5 w-5" />}
          tone="coral"
        />
        <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">计算控制</span>
            {lastCalculatedAt && (
              <span className="text-[10px] text-gray-500">
                {new Date(lastCalculatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={runCalculation}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#d4a24c] to-[#b8873a] px-4 py-2.5 text-sm font-semibold text-[#0a1828] shadow-md transition-all hover:shadow-lg hover:brightness-110"
          >
            <Play className="h-4 w-4" />
            {schedules.length === 0 ? '执行排期计算' : '重新计算排期'}
          </button>
          {schedules.length > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-[#7bc9a7]">
              <RefreshCw className="h-3 w-3" />
              共生成 {validSchedules.length} 条有效排期
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <GanttChart questions={questions} schedules={schedules} />

          {schedules.length > 0 && (
            <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2a4a73] bg-[#173252] px-4 py-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#d4a24c]" />
                  <h3 className="font-serif text-lg font-semibold">排期明细</h3>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#173252] text-xs text-gray-400 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">位次</th>
                      <th className="px-3 py-2 text-left font-medium">题目</th>
                      <th className="px-3 py-2 text-center font-medium">综合评分</th>
                      <th className="px-3 py-2 text-center font-medium">置信度</th>
                      <th className="px-3 py-2 text-center font-medium">批次</th>
                      <th className="px-3 py-2 text-center font-medium">发布日期</th>
                      <th className="px-3 py-2 text-center font-medium">评分拆解</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validSchedules
                      .sort((a, b) => a.rank - b.rank)
                      .map((s, idx) => {
                        const q = questions.find((qq) => qq.id === s.questionId);
                        const rowBg = idx % 2 === 0 ? 'bg-[#0f2138]' : 'bg-[#12283f]';
                        return (
                          <tr key={s.questionId} className={`${rowBg} border-t border-[#1a2f4d] transition-colors hover:bg-[#1a2f4d]/70`}>
                            <td className="px-3 py-2 font-mono text-xs text-[#d4a24c]">#{s.rank}</td>
                            <td className="px-3 py-2">
                              <div className="font-mono text-[10px] text-gray-500">{s.questionId}</div>
                              <div className="text-sm text-gray-100">{q?.name}</div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="font-mono text-sm font-semibold text-white">{s.score.toFixed(3)}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1e3a5f]">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${s.confidence * 100}%`,
                                      background: s.confidence >= 0.8 ? '#2d936c' : s.confidence >= 0.6 ? '#d4a24c' : '#c85353',
                                    }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-gray-400">{Math.round(s.confidence * 100)}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="rounded-full bg-[#2d5a8f] px-2 py-0.5 text-xs text-[#8ab8e0]">
                                第{s.batch}批
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-xs text-gray-300">{s.publishDate}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1 font-mono text-[10px] text-gray-400">
                                <span title="难度" className="text-[#8ab8e0]">D̃{s.scoreBreakdown.normalizedDifficulty.toFixed(2)}</span>
                                <span>·</span>
                                <span title="错题率" className="text-[#e0c080]">E{s.scoreBreakdown.errorRateComponent.toFixed(2)}</span>
                                <span>·</span>
                                <span title="依赖深度" className="text-[#c07098]">P{s.scoreBreakdown.dependencyPenalty.toFixed(2)}</span>
                                <span>·</span>
                                <span title="章节" className="text-[#7bc9a7]">C{s.scoreBreakdown.chapterOrder.toFixed(2)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <FormulaCard />
          <GapList maxItems={6} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  tone,
}: {
  label: string;
  value: number;
  suffix: string;
  icon: React.ReactNode;
  tone: 'sky' | 'emerald' | 'coral' | 'amber';
}) {
  const colors: Record<string, string> = {
    sky: 'text-[#4a8ec2] border-[#4a8ec2]/30 bg-[#4a8ec2]/10',
    emerald: 'text-[#2d936c] border-[#2d936c]/30 bg-[#2d936c]/10',
    coral: 'text-[#c85353] border-[#c85353]/30 bg-[#c85353]/10',
    amber: 'text-[#d4a24c] border-[#d4a24c]/30 bg-[#d4a24c]/10',
  };
  return (
    <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`rounded-md border p-1.5 ${colors[tone]}`}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-serif-display text-3xl font-bold text-white">{value}</span>
        <span className="text-sm text-gray-500">{suffix}</span>
      </div>
    </div>
  );
}
