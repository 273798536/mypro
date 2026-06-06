import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Undo2,
  Clock,
  MapPin,
  Layers,
  History,
  Home,
} from 'lucide-react'
import { useAnnotationStore } from '../store/annotation'
import { downloadReport } from '../utils/exportReport'
import type { ReportData } from '../types'

const actionLabel: Record<string, string> = {
  place: '放置货物',
  undo: '撤销操作',
  restart: '重开关卡',
  snap_toggle: '切换网格',
  clear: '移除货物',
}

const actionColor: Record<string, string> = {
  place: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  undo: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  restart: 'bg-red-500/15 text-red-300 border-red-500/40',
  snap_toggle: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  clear: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m} 分 ${sec} 秒`
}

const Summary = () => {
  const navigate = useNavigate()
  const report = useAnnotationStore((s) => s.generateReport())
  const resetAll = useAnnotationStore((s) => s.resetAll)
  const currentLevelId = useAnnotationStore((s) => s.currentLevelId)

  useEffect(() => {
    if (!report) navigate('/')
  }, [report, navigate])

  if (!report) return null

  const r: ReportData = report
  const undoAndRestart = r.history.filter((h) => h.action === 'undo' || h.action === 'restart')

  const handleExport = () => {
    downloadReport(r)
  }

  const handleHome = () => {
    resetAll()
    navigate('/')
  }

  const handleBackToWork = () => {
    navigate('/workspace')
  }

  return (
    <div className="min-h-screen bg-deck-surface text-gray-100">
      <header className="bg-deck-panel border-b border-slate-700/50 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToWork} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
              <ArrowLeft className="w-4 h-4" /> 返回工作区
            </button>
            <div>
              <h1 className="text-lg font-bold">结算报告 · {r.levelName}</h1>
              <p className="text-xs text-slate-400">
                完成时间 {new Date(r.completedAt).toLocaleString('zh-CN')} · 总耗时 {formatDuration(r.totalDuration)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
              <Download className="w-4 h-4" /> 导出可读报告
            </button>
            <button onClick={handleHome} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
              <Home className="w-4 h-4" /> 返回选关
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><Layers className="w-3.5 h-3.5" /> 已放置</div>
            <div className="text-2xl font-bold text-deck-success">{r.placements.length}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><Undo2 className="w-3.5 h-3.5" /> 撤销</div>
            <div className="text-2xl font-bold text-amber-400">{r.undoCount}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><RotateCcw className="w-3.5 h-3.5" /> 重开</div>
            <div className="text-2xl font-bold text-red-400">{r.restartCount}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><AlertTriangle className="w-3.5 h-3.5" /> 边界失败</div>
            <div className="text-2xl font-bold text-deck-accent">{r.boundaryFailures}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><MapPin className="w-3.5 h-3.5" /> 碰撞</div>
            <div className="text-2xl font-bold text-purple-400">{r.collisionEvents}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><Clock className="w-3.5 h-3.5" /> 吸附切换</div>
            <div className="text-2xl font-bold text-blue-400">{r.gridSnapChanges}</div>
          </div>
        </section>

        {/* Issues - most important for trainer */}
        <section className="card p-5">
          <h2 className="font-bold text-base mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-deck-warning" />
            材料问题与复核结果
            <span className="text-xs text-slate-400 font-normal ml-1">（训练员重点查看：每项都标明了卡在哪份材料上）</span>
          </h2>
          <div className="space-y-3">
            {r.issues.map((issue, idx) => (
              <div key={idx} className={`rounded-lg border p-4 ${issue.resolved ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{issue.issueType}</span>
                      <span className={`badge ${issue.resolved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                        {issue.resolved ? '已处理' : '未处理 / 需跟进'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-200">涉及货物：<strong>{issue.cargoName}</strong></p>
                    <div className="mt-2 p-2 rounded bg-slate-900/50 border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-0.5">材料来源：</p>
                      <p className="text-sm text-deck-warning">{issue.materialSource}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{issue.issueDescription}</p>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    {issue.resolved ? <CheckCircle2 className="w-6 h-6 text-deck-success" /> : <XCircle className="w-6 h-6 text-deck-accent" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Undo / Restart records with state desync */}
        <section className="card p-5">
          <h2 className="font-bold text-base mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            撤销与重开记录
            <span className="text-xs text-slate-400 font-normal ml-1">（状态不同步卡在哪份材料一目了然）</span>
          </h2>
          {undoAndRestart.length === 0 ? (
            <p className="text-sm text-slate-400 italic">无撤销或重开记录</p>
          ) : (
            <div className="space-y-3">
              {undoAndRestart.map((h, idx) => (
                <div key={h.id} className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${h.action === 'undo' ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                      {h.action === 'undo' ? <Undo2 className="w-4 h-4 text-amber-400" /> : <RotateCcw className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge border ${actionColor[h.action]}`}>{actionLabel[h.action] ?? h.action}</span>
                        <span className="text-xs text-slate-400">#{idx + 1} · {new Date(h.timestamp).toLocaleTimeString('zh-CN')}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-200">{h.description}</p>
                      {h.stateDesync && (
                        <div className="mt-3 p-3 rounded-lg border border-deck-accent/50 bg-deck-accent/10">
                          <p className="text-xs font-semibold text-deck-accent mb-1">⚠ 状态不同步定位</p>
                          <p className="text-sm text-slate-200"><strong>卡在材料：</strong>{h.stateDesync.material}</p>
                          <p className="text-sm text-slate-300 mt-1"><strong>原因：</strong>{h.stateDesync.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Placements details */}
        <section className="card p-5">
          <h2 className="font-bold text-base mb-3 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-deck-success" />
            已放置货位明细
          </h2>
          {r.placements.length === 0 ? (
            <p className="text-sm text-slate-400 italic">没有已放置的货物</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 px-2 font-medium">序</th>
                    <th className="text-left py-2 px-2 font-medium">货物名称</th>
                    <th className="text-left py-2 px-2 font-medium">坐标</th>
                    <th className="text-left py-2 px-2 font-medium">网格吸附</th>
                    <th className="text-left py-2 px-2 font-medium">放置时间</th>
                    <th className="text-left py-2 px-2 font-medium">是否有材料问题</th>
                  </tr>
                </thead>
                <tbody>
                  {r.placements.map((p, idx) => {
                    const issue = r.issues.find((i) => i.cargoId === p.cargoId)
                    return (
                      <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium">{issue?.cargoName ?? p.cargoId}</td>
                        <td className="py-2 px-2 text-slate-300">({p.x}, {p.y})</td>
                        <td className="py-2 px-2">
                          {p.gridSnapped
                            ? <span className="badge bg-blue-500/20 text-blue-300 border-blue-500/40">已吸附</span>
                            : <span className="badge bg-slate-500/20 text-slate-300 border-slate-500/40">未吸附</span>}
                        </td>
                        <td className="py-2 px-2 text-slate-400 text-xs">{new Date(p.placedAt).toLocaleTimeString('zh-CN')}</td>
                        <td className="py-2 px-2">
                          {issue
                            ? <span className="badge bg-deck-accent/20 text-deck-accent border-deck-accent/40">有：{issue.issueType}</span>
                            : <span className="badge bg-emerald-500/15 text-emerald-300 border-emerald-500/30">无</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Full timeline */}
        <section className="card p-5">
          <h2 className="font-bold text-base mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            完整操作时间线
          </h2>
          <ol className="relative border-l border-slate-700 ml-2 space-y-3">
            {r.history.map((h, idx) => (
              <li key={h.id} className="ml-5">
                <span className={`absolute -left-[7px] w-3 h-3 rounded-full border-2 ${h.action === 'place' ? 'bg-emerald-500 border-emerald-300' : h.action === 'undo' ? 'bg-amber-500 border-amber-300' : h.action === 'restart' ? 'bg-red-500 border-red-300' : 'bg-slate-500 border-slate-300'}`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge border ${actionColor[h.action]}`}>{actionLabel[h.action] ?? h.action}</span>
                  <span className="text-xs text-slate-400">#{idx + 1} · {new Date(h.timestamp).toLocaleTimeString('zh-CN')}</span>
                </div>
                <p className="mt-1 text-sm text-slate-200">{h.description}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">
        船舶甲板货位草图标注训练 · 结算报告 · 可通过顶部「导出可读报告」下载给非技术人员查看
      </footer>

      {/* Keep levelId alive in store reference */}
      <span className="hidden">{currentLevelId}</span>
    </div>
  )
}

export default Summary
