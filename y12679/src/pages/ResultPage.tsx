import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { downloadReport } from '@/utils/report'
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flag,
  Layers,
  Thermometer,
  Wind,
  FileText,
  RotateCcw,
} from 'lucide-react'
import type { ViolationType } from '@/types'

const violationConfig: Record<ViolationType, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof CheckCircle2 }> = {
  none: { label: '正常', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: CheckCircle2 },
  warning: { label: '警告级越界', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: AlertTriangle },
  critical: { label: '严重越界', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', icon: XCircle },
}

const ResultPage = () => {
  const navigate = useNavigate()
  const { analysisResult, currentSample, generateAnalysis, resetGame } = useGameStore()

  const result = useMemo(() => {
    return analysisResult || generateAnalysis()
  }, [analysisResult, generateAnalysis])

  const overallStatus = useMemo(() => {
    if (result.criticalCount > 0) return { type: 'critical', label: '严重不合格', color: 'from-rose-500 to-red-600' }
    if (result.warningCount > 0) return { type: 'warning', label: '待人工确认', color: 'from-amber-500 to-orange-500' }
    return { type: 'success', label: '检测通过', color: 'from-emerald-500 to-teal-600' }
  }, [result])

  const handleExport = () => {
    downloadReport(result)
  }

  const handleReset = () => {
    resetGame()
    navigate('/')
  }

  if (!currentSample) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/50 flex items-center justify-center">
        <div className="text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">暂无分析数据，请先完成检测</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-sky-50/50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">返回游戏</span>
          </button>
          <h1 className="text-lg font-bold text-slate-800">
            <Flag size={18} className="inline mr-2 text-cyan-600" />
            分析结算报告
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <RotateCcw size={16} />
              重新开始
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-lg hover:from-cyan-700 hover:to-sky-700 transition-all text-sm font-medium shadow-md shadow-cyan-500/25"
            >
              <Download size={16} />
              导出HTML报告
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="space-y-6">
          <div className={`bg-gradient-to-r ${overallStatus.color} rounded-2xl p-6 text-white shadow-xl`}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-white/80 text-sm mb-1">分析对象</p>
                <h2 className="text-2xl font-bold">{currentSample.name}</h2>
                <p className="text-white/70 text-sm mt-1 max-w-2xl">{currentSample.description}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                  {overallStatus.type === 'success' ? (
                    <CheckCircle2 size={20} />
                  ) : overallStatus.type === 'warning' ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <XCircle size={20} />
                  )}
                  <span className="font-bold text-lg">{overallStatus.label}</span>
                </div>
                <p className="text-white/70 text-xs mt-2">
                  报告生成于 {new Date(result.generatedAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Layers size={16} />
                剖切面总数
              </div>
              <div className="text-3xl font-bold text-slate-800">{result.totalCrossSections}</div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 text-sm mb-2">
                <CheckCircle2 size={16} />
                正常剖切面
              </div>
              <div className="text-3xl font-bold text-emerald-700">
                {result.totalCrossSections - result.violatedCount}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-2">
                <AlertTriangle size={16} />
                警告级越界
              </div>
              <div className="text-3xl font-bold text-amber-700">{result.warningCount}</div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-rose-200 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 text-sm mb-2">
                <XCircle size={16} />
                严重越界
              </div>
              <div className="text-3xl font-bold text-rose-700">{result.criticalCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-700 font-semibold mb-4">
                <Wind size={18} className="text-cyan-600" />
                气流参数概览
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                  <span className="text-slate-600">平均风速</span>
                  <span className="font-bold text-cyan-700">{currentSample.airflowData.avgVelocity.toFixed(1)} m/s</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-slate-600">
                    <Thermometer size={14} className="inline mr-1" />
                    平均温度
                  </span>
                  <span className="font-bold text-orange-700">{currentSample.airflowData.avgTemperature.toFixed(1)} °C</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">气流路径数</span>
                  <span className="font-bold text-slate-700">{currentSample.airflowData.paths.length} 条</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">设备数量</span>
                  <span className="font-bold text-slate-700">{currentSample.layoutData.obstacles.length} 台</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-700 font-semibold mb-4">
                <FileText size={18} className="text-cyan-600" />
                总体评估说明
              </div>
              <div className={`p-4 rounded-lg border ${violationConfig[overallStatus.type === 'success' ? 'none' : overallStatus.type as ViolationType].bgColor} ${violationConfig[overallStatus.type === 'success' ? 'none' : overallStatus.type as ViolationType].borderColor}`}>
                {overallStatus.type === 'success' ? (
                  <div>
                    <p className={`font-semibold mb-2 ${violationConfig.none.color}`}>结论：工况正常</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      所有 {result.totalCrossSections} 个剖切面均在安全范围内，气流组织良好，风速和温度参数正常。
                      可按当前参数继续运行，建议定期（每季度）进行一次检测。
                    </p>
                  </div>
                ) : overallStatus.type === 'warning' ? (
                  <div>
                    <p className={`font-semibold mb-2 ${violationConfig.warning.color}`}>结论：需要人工确认</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      检测到 {result.warningCount} 处警告级越界，部分剖切面已接近安全阈值。虽然暂未达到严重程度，
                      但建议在 3 个工作日内安排工程师到现场复核，结合实际运行情况决定是否需要调整。
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className={`font-semibold mb-2 ${violationConfig.critical.color}`}>结论：需要立即整改</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      检测到 {result.criticalCount} 处严重越界和 {result.warningCount} 处警告级越界，
                      存在明显的气流短路或边界溢出问题。建议立即暂停相关设备运行，按照下方各剖切面的修正建议进行调整，
                      调整完成后重新运行检测确认问题已解决。
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                <p className="text-xs text-cyan-700 leading-relaxed">
                  <strong>📌 提示：</strong>上方的颜色标识仅为辅助快速判断，请务必阅读下方每个剖切面的详细文字说明，
                  包括越界原因、位置坐标和修正建议。导出的HTML报告包含完整的分析内容，适合打印或发送给甲方审阅。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Layers size={18} className="text-cyan-600" />
                剖切面越界详情
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                下表列出每个剖切面的检测结果、越界原因、具体位置和建议修正方案。
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {result.crossSectionDetails.map((cs) => {
                const cfg = violationConfig[cs.violationType]
                const Icon = cfg.icon
                return (
                  <div key={cs.id} className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${cfg.bgColor} ${cfg.borderColor} border flex items-center justify-center flex-shrink-0`}>
                          <Icon size={20} className={cfg.color} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800">{cs.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cs.isViolated ? `检测到 ${cs.violations.length} 项问题` : '未检测到越界问题'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${cfg.bgColor} ${cfg.color} ${cfg.borderColor} border`}>
                        {cfg.label}
                      </span>
                    </div>

                    {cs.violations.length > 0 ? (
                      <div className="mt-4 ml-13 space-y-3">
                        {cs.violations.map((v, idx) => (
                          <div key={v.id} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                            <div className="flex items-start gap-3 flex-wrap">
                              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <div>
                                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">越界类型</span>
                                  <p className="text-sm font-medium text-slate-800 mt-0.5">{v.type}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">原因说明</span>
                                  <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">{v.reason}</p>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                  <div>
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">位置坐标</span>
                                    <p className="text-sm font-mono text-slate-700 mt-0.5">
                                      ({v.position.x.toFixed(0)}, {v.position.y.toFixed(0)})
                                    </p>
                                  </div>
                                  {v.distance > 0 && (
                                    <div>
                                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">距剖切面</span>
                                      <p className="text-sm font-mono text-slate-700 mt-0.5">{v.distance.toFixed(1)} px</p>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">严重程度</span>
                                    <p className="text-sm text-slate-700 mt-0.5">
                                      {v.severity === 3 ? '高（需立即处理）' : v.severity === 2 ? '中（需关注）' : '低'}
                                    </p>
                                  </div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">💡 修正建议</span>
                                  <p className="text-sm text-emerald-800 mt-0.5 leading-relaxed">{v.suggestedFix}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 ml-13 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-sm text-emerald-700">
                          <CheckCircle2 size={14} className="inline mr-1" />
                          该剖切面距离所有气流路径均超过安全阈值，状态正常。
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {result.screenshots.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-cyan-600" />
                  截图证据清单（{result.screenshots.length}）
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  以下为分析过程中捕获的关键节点截图，配合碰撞检测结果辅助判断越界情况。
                </p>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.screenshots.map((s, idx) => (
                  <div key={s.id} className={`rounded-lg border overflow-hidden ${s.hasViolation ? 'border-rose-200' : 'border-slate-200'}`}>
                    <div className={`px-3 py-2 flex items-center justify-between text-xs ${s.hasViolation ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>
                      <span className="font-semibold">截图 #{idx + 1}</span>
                      <span>{new Date(s.timestamp).toLocaleTimeString('zh-CN')}</span>
                    </div>
                    <img src={s.imageData} alt={s.description} className="w-full h-40 object-cover" />
                    <div className="p-3">
                      <p className="text-sm text-slate-700">{s.description || '无描述'}</p>
                      {s.detectedViolations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-xs font-semibold text-rose-600 mb-1">检测标注：</p>
                          {s.detectedViolations.map((v, i) => (
                            <p key={i} className="text-xs text-rose-600">• {v}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-8 py-6 text-center text-xs text-slate-400">
        大型机房气流路径剖切面越界检测系统 · 分析结算页面
      </footer>
    </div>
  )
}

export default ResultPage
