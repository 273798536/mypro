import ProblemList from '../components/ProblemList'
import GraphView from '../components/GraphView'
import CalcTable from '../components/CalcTable'
import AnomalyPanel from '../components/AnomalyPanel'
import EvidenceChain from '../components/EvidenceChain'
import ReviewEntry from '../components/ReviewEntry'
import { useStore } from '../store'
import { Activity, AlertTriangle, GitBranch, ClipboardList } from 'lucide-react'

export default function Home() {
  const { problems, selectedProblemId, calcSteps, anomalies, reviewRecords } = useStore()
  const problem = problems.find(p => p.id === selectedProblemId)

  const problemSteps = calcSteps.filter(s => s.problemId === selectedProblemId)
  const problemAnomalies = anomalies.filter(a => a.problemId === selectedProblemId)
  const problemReviews = reviewRecords.filter(r => r.problemId === selectedProblemId)
  const pendingAnomalies = problemAnomalies.filter(a => a.status === 'pending')
  const cutVertices = [...new Set(problemSteps.filter(s => s.isCutCandidate).map(s => s.currentNode))]

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e] text-zinc-200 overflow-hidden">
      <header className="shrink-0 border-b border-zinc-800/80 bg-[#16162a]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-amber-400 tracking-wide">图论割点错因追踪</h1>
              <p className="text-[10px] text-zinc-500">教研编辑阿宁 · 证据链 & 异常追踪</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />
              {problems.length} 道题
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              {anomalies.filter(a => a.status === 'pending').length} 条待处理
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              {problems.filter(p => p.status === 'reviewed').length} 已复核
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-64 shrink-0 border-r border-zinc-800/80 bg-[#16162a]/50 overflow-hidden">
          <ProblemList />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {problem ? (
            <>
              <div className="shrink-0 border-b border-zinc-800/80 px-5 py-3 bg-[#16162a]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-100">{problem.title}</h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{problem.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <div className="text-right">
                      <div className="text-zinc-500">期望割点</div>
                      <div className="text-amber-400 font-mono font-semibold">
                        {'{'}{problem.expectedCutVertices.join(', ')}{'}'}
                      </div>
                    </div>
                    <div className="w-px h-6 bg-zinc-800" />
                    <div className="text-right">
                      <div className="text-zinc-500">算法结论</div>
                      <div className="text-emerald-400 font-mono font-semibold">
                        {'{'}{cutVertices.join(', ')}{'}'}
                      </div>
                    </div>
                    <div className="w-px h-6 bg-zinc-800" />
                    <div className="text-right">
                      <div className="text-zinc-500">提交答案</div>
                      <div className="text-zinc-300 font-mono font-semibold">
                        {'{'}{problem.submittedAnswer.join(', ')}{'}'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                  <div className="shrink-0 h-[240px] border-b border-zinc-800/80">
                    <GraphView />
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">中间计算表</h3>
                      <span className="text-[10px] text-zinc-600">{problemSteps.length} 步</span>
                    </div>
                    <CalcTable />
                  </div>

                  {problemAnomalies.length > 0 && (
                    <div className="p-4 border-t border-zinc-800/80">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
                          异常检测
                        </h3>
                        <span className="text-[10px] text-red-400">
                          {pendingAnomalies.length} 条待处理 / {problemAnomalies.length} 条总计
                        </span>
                      </div>
                      <AnomalyPanel />
                    </div>
                  )}

                  <div className="p-4 border-t border-zinc-800/80">
                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">复核入口</h3>
                    </div>
                    <ReviewEntry />
                  </div>

                  {problemReviews.length > 0 && (
                    <div className="p-4 border-t border-zinc-800/80">
                      <div className="mb-2">
                        <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">复核历史</h3>
                      </div>
                      <div className="space-y-1.5">
                        {problemReviews.slice().reverse().map(review => (
                          <div key={review.id} className="bg-zinc-800/40 border border-zinc-700/40 rounded-lg p-2.5">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-zinc-500">{review.previousConclusion}</span>
                              <span className="text-amber-400">→</span>
                              <span className="text-zinc-200 font-medium">{review.currentConclusion}</span>
                            </div>
                            {review.diffExplanation && (
                              <div className="mt-1 text-[10px] text-amber-400/80 bg-amber-500/5 px-2 py-1 rounded italic">
                                💡 {review.diffExplanation}
                              </div>
                            )}
                            <div className="text-[9px] text-zinc-600 mt-1">
                              {new Date(review.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="w-72 shrink-0 border-l border-zinc-800/80 bg-[#16162a]/30 overflow-hidden">
                  <EvidenceChain />
                </aside>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <GitBranch className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">从左侧选择一道题目开始</p>
                <p className="text-zinc-600 text-xs mt-1">点击题目卡片查看图结构、计算表和证据链</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
