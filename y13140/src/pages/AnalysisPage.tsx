import {
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { useAppStoreShallow } from '@/store/useAppStoreShallow';

export default function AnalysisPage() {
  const { records, expandedRecords, toggleRecord } = useAppStoreShallow((s) => ({
    records: s.records,
    expandedRecords: s.expandedRecords,
    toggleRecord: s.toggleRecord,
  }));

  const totalContrib = records.reduce((s, r) => s + r.contributionToConclusion, 0) || 1;

  return (
    <div className="max-w-[980px] mx-auto p-6 fade-in">
      <header className="mb-6">
        <h1 className="font-song text-2xl text-ink-800">分析页 · 逐条展开</h1>
        <p className="text-sm text-ink-500 mt-1">
          朴素但讲清楚：为什么一条"正常记录"能改变结论。
        </p>
      </header>

      {/* 贡献占比总览 */}
      <section className="bg-white border border-ink-200 rounded-[2px] p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-ink-600" />
          <span className="text-[11px] text-ink-400 tracking-widest font-hei">
            对结论的贡献占比
          </span>
        </div>
        <div className="space-y-2.5">
          {records.map((r) => {
            const pct = (r.contributionToConclusion / totalContrib) * 100;
            const isWeird = r.isSeeminglyNormal;
            return (
              <div key={r.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-[2px] shrink-0 flex items-center justify-center text-[10px] font-hei ${
                  isWeird
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-ink-100 text-ink-600'
                }`}>
                  {isWeird ? '!' : '·'}
                </span>
                <div className="flex-1 h-6 bg-ink-100 rounded-[2px] relative overflow-hidden">
                  <div
                    className={`h-full ${
                      isWeird
                        ? 'bg-gradient-to-r from-amber-300 to-amber-500'
                        : 'bg-ink-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px]">
                    <span
                      className={`truncate max-w-[70%] ${
                        isWeird ? 'text-ink-800 font-hei' : 'text-ink-700'
                      }`}
                    >
                      {r.title}
                    </span>
                    <span className="font-mono text-ink-800 shrink-0">
                      {r.contributionToConclusion}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 影响链路 */}
      <section className="mb-6 p-4 border-2 border-amber-200 rounded-[2px] bg-gradient-to-br from-amber-50 to-white relative">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 shrink-0 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
            <Lightbulb size={17} />
          </div>
          <div className="flex-1 text-sm text-ink-800 leading-relaxed">
            <div className="font-hei mb-1">影响链路说明（为什么这条正常记录改变了结论）</div>
            <ol className="space-y-1 text-xs text-ink-700 mt-2">
              <li className="flex items-start gap-2">
                <span className="font-mono text-amber-700">①</span>
                <span>
                  记录＃11 所有输入都在标注的可行域内（A=480，12×18+15×16=456 ≤ 480，✓可行）
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-amber-700">②</span>
                <span className="flex items-center gap-2">
                  <span>v1-3 匿名改权重 p1：0.40 → 0.53 （+32.5%）</span>
                  <span className="dashed-arrow inline-block w-12 h-0 align-middle" />
                  <span className="bg-amber-100 px-1.5 py-0.5 rounded-[2px] font-mono text-[11px]">
                    占比 36% → 59%
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-amber-700">③</span>
                <span>
                  最终结论从"保守估计 ≤5600"被拉到"激进估计 ≥5800"，放大了约 200 分。
                </span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* 记录逐条展开 */}
      <section className="space-y-3">
        {records.map((r) => {
          const isOpen = expandedRecords.includes(r.id);
          const isWeird = r.isSeeminglyNormal;
          return (
            <div
              key={r.id}
              className={`bg-white rounded-[2px] border ${
                isWeird
                  ? isOpen
                    ? 'border-amber-300 shadow-sm ring-2 ring-amber-100'
                    : 'border-amber-200'
                  : 'border-ink-200'
              } transition-all`}
            >
              <button
                onClick={() => toggleRecord(r.id)}
                className="w-full text-left px-5 py-3.5 flex items-center gap-3"
              >
                <span
                  className={`w-6 h-6 shrink-0 rounded-[2px] flex items-center justify-center ${
                    isWeird
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {isWeird ? <AlertTriangle size={13} /> : <span className="text-[11px] font-mono">§</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm ${
                      isWeird ? 'text-amber-800 font-hei' : 'text-ink-800'
                    } truncate`}
                  >
                    {r.title}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5 font-hei flex items-center gap-3">
                    <span>贡献占比 {r.contributionToConclusion}%</span>
                    {isWeird && (
                      <span className="text-amber-700 inline-flex items-center gap-1">
                        <span>看似正常但改变结论</span>
                        <ArrowRight size={11} />
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-ink-500 chevron-toggle ${
                    isOpen ? 'open' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-ink-100 px-5 py-4 space-y-4 fade-in">
                  {/* 输入参数 */}
                  <div>
                    <SectionTitle icon={<Calculator size={13} />} text="输入参数快照" />
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                      {Object.entries(r.inputParams).map(([k, v]) => (
                        <div
                          key={k}
                          className="p-2.5 bg-ink-50 border border-ink-200 rounded-[2px]"
                        >
                          <div className="font-mono text-[10px] text-ink-500">{k}</div>
                          <div className="font-mono text-sm text-ink-800 mt-0.5">
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 计算过程 */}
                  <div>
                    <SectionTitle icon={<Calculator size={13} />} text="计算过程" />
                    <div className="mt-2 bg-ink-50 border border-ink-200 rounded-[2px] overflow-hidden">
                      <div className="px-3 py-2 border-b border-ink-200 text-xs font-mono text-ink-700 bg-white">
                        {r.calculation.formula}
                      </div>
                      <ol className="divide-y divide-ink-100 text-xs text-ink-700">
                        {r.calculation.steps.map((st, i) => (
                          <li key={i} className="px-4 py-2 flex items-start gap-2">
                            <span className="font-mono text-ink-400 w-5 shrink-0">
                              {i + 1}.
                            </span>
                            <span className="font-mono leading-relaxed">{st}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="px-4 py-2 border-t border-ink-200 bg-ink-100/40 flex items-center justify-between text-xs">
                        <span className="text-ink-500 font-hei">结果</span>
                        <span className="font-mono text-ink-800">
                          Z = {r.calculation.result}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 影响链路 */}
                  <div>
                    <SectionTitle icon={<Lightbulb size={13} />} text="对结论的影响" />
                    <div
                      className={`mt-2 p-3 rounded-[2px] border ${
                        isWeird
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-ink-50 border-ink-200 text-ink-700'
                      } text-xs leading-relaxed`}
                    >
                      {r.impactExplanation}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-ink-500 tracking-wide font-hei">
      {icon}
      {text}
    </div>
  );
}
