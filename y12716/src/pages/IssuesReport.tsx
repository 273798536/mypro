import { useMemo } from 'react';
import { AlertTriangle, AlertOctagon, Shield, Lightbulb, BarChart3 } from 'lucide-react';
import { GapList } from '@/components/GapList';
import { EdgeCaseCard } from '@/components/EdgeCaseCard';
import { edgeCases } from '@/utils/edgeCases';
import { useAppStore } from '@/store/useAppStore';

export default function IssuesReport() {
  const { gaps, questions } = useAppStore();

  const summary = useMemo(() => {
    const bySeverity = { warning: 0, error: 0 };
    const byField: Record<string, number> = {};
    const byQuestion: Record<string, number> = {};
    for (const g of gaps) {
      bySeverity[g.severity]++;
      byField[g.fieldName] = (byField[g.fieldName] || 0) + 1;
      byQuestion[g.questionId] = (byQuestion[g.questionId] || 0) + 1;
    }
    const topOffenders = Object.entries(byQuestion)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([qid, cnt]) => {
        const q = questions.find((qq) => qq.id === qid);
        return { qid, name: q?.name || qid, count: cnt };
      });
    return { bySeverity, byField, topOffenders, byQuestion };
  }, [gaps, questions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[#c85353]/30 bg-gradient-to-br from-[#c85353]/10 to-transparent p-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-[#e99090]" />
            <span className="text-xs text-gray-400">错误级别缺口</span>
          </div>
          <div className="font-serif-display text-3xl font-bold text-[#e99090]">
            {summary.bySeverity.error}
          </div>
          <p className="mt-1 text-[10px] text-gray-500">
            对应题目已跳过计算，需修复后重新排期
          </p>
        </div>
        <div className="rounded-lg border border-[#d4a24c]/30 bg-gradient-to-br from-[#d4a24c]/10 to-transparent p-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#d4a24c]" />
            <span className="text-xs text-gray-400">警告级别缺口</span>
          </div>
          <div className="font-serif-display text-3xl font-bold text-[#d4a24c]">
            {summary.bySeverity.warning}
          </div>
          <p className="mt-1 text-[10px] text-gray-500">
            使用兜底值继续计算，置信度已相应降低
          </p>
        </div>
        <div className="rounded-lg border border-[#2d936c]/30 bg-gradient-to-br from-[#2d936c]/10 to-transparent p-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#7bc9a7]" />
            <span className="text-xs text-gray-400">完整题目</span>
          </div>
          <div className="font-serif-display text-3xl font-bold text-[#7bc9a7]">
            {questions.length - Object.keys(summary.byQuestion).length}
          </div>
          <p className="mt-1 text-[10px] text-gray-500">
            无任何数据缺口，可完全信任其排期
          </p>
        </div>
        <div className="rounded-lg border border-[#4a8ec2]/30 bg-gradient-to-br from-[#4a8ec2]/10 to-transparent p-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#8ab8e0]" />
            <span className="text-xs text-gray-400">Top 缺口类型</span>
          </div>
          <div className="space-y-1">
            {Object.entries(summary.byField)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([field, cnt]) => (
                <div key={field} className="flex justify-between text-xs">
                  <span className="text-gray-300">{field}</span>
                  <span className="font-mono text-[#8ab8e0]">{cnt}</span>
                </div>
              ))}
            {Object.keys(summary.byField).length === 0 && (
              <div className="text-xs text-gray-500">暂无缺口</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2a4a73] bg-[#173252] px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#d4a24c]" />
                <h3 className="font-serif text-lg font-semibold">缺口最多的题目</h3>
              </div>
              <span className="text-xs text-gray-500">优先补全这些记录收益最大</span>
            </div>
            <div className="divide-y divide-[#1a2f4d]">
              {summary.topOffenders.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#7bc9a7]">
                  <Shield className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  太棒了！所有题目数据完整
                </div>
              ) : (
                summary.topOffenders.map((t, idx) => (
                  <div
                    key={t.qid}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#1a2f4d]/60"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] font-mono text-xs text-[#d4a24c]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#d4a24c]">{t.qid}</span>
                        <span className="truncate text-sm text-gray-100">{t.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[#1e3a5f]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#d4a24c] to-[#c85353]"
                            style={{ width: `${Math.min(100, t.count * 30)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500">{t.count} 处缺口</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {gaps
                        .filter((g) => g.questionId === t.qid)
                        .slice(0, 3)
                        .map((g, i) => (
                          <span
                            key={i}
                            className={`ml-1 rounded px-1.5 py-0.5 text-[9px] ${
                              g.severity === 'error'
                                ? 'bg-[#c85353]/20 text-[#e99090]'
                                : 'bg-[#d4a24c]/20 text-[#e0c080]'
                            }`}
                          >
                            {g.fieldName}
                          </span>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <GapList />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[#d4a24c]/40 bg-[#0f2138] text-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#d4a24c]/20 bg-gradient-to-r from-[#d4a24c]/15 to-transparent px-4 py-3">
              <Lightbulb className="h-5 w-5 text-[#d4a24c]" />
              <h3 className="font-serif text-lg font-semibold">真实边界案例演示</h3>
            </div>
            <div className="px-4 py-3 text-xs text-gray-400 leading-relaxed">
              下面收录了 3 个投研助理日常工作中最常遇到的边界情况。
              每个案例都来自真实数据迁移小事故，并且都会 <span className="text-[#d4a24c]">真正改变排期结果</span>，
              而不是仅仅触发一个无害的警告。点击展开查看 before/after 对比。
            </div>
          </div>
          <div className="space-y-3">
            {edgeCases.map((ec) => (
              <EdgeCaseCard key={ec.id} edgeCase={ec} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
