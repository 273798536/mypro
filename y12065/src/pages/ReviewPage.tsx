import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Trophy,
  XCircle,
  AlertTriangle,
  Download,
  Home,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  X,
  Copy,
  Link2,
  FileText,
  Volume2,
  Lightbulb,
} from 'lucide-react'
import Header from '@/components/Header'
import ClueCard from '@/components/ClueCard'
import AudioClueCard from '@/components/AudioClueCard'
import { useGameStore } from '@/store/gameStore'
import { CLUES, AUDIO_CLUES, getCaseById } from '@/data/mockData'
import { downloadReport } from '@/utils/reportGenerator'
import type { CaseReport } from '@/types'

const ReviewPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lastReport, getCurrentCaseData, setHighlightedSource, resetCaseState, setCurrentCase } =
    useGameStore()

  const { caseData, clues, audioClues } = getCurrentCaseData()

  useEffect(() => {
    if (id && !lastReport) {
      setCurrentCase(id)
    }
  }, [id, lastReport, setCurrentCase])

  const report: CaseReport | null = useMemo(() => {
    if (lastReport) return lastReport

    if (id && caseData) {
      const stored = sessionStorage.getItem(`report_${id}`)
      if (stored) {
        return JSON.parse(stored)
      }
    }
    return null
  }, [lastReport, id, caseData])

  useEffect(() => {
    if (report && id) {
      sessionStorage.setItem(`report_${id}`, JSON.stringify(report))
    }
  }, [report, id])

  useEffect(() => {
    if (report) {
      document.title = `复盘 - ${report.caseTitle} - 乐理和弦侦探`
    }
  }, [report])

  const handleSourceClick = (sourceId: string) => {
    setHighlightedSource(sourceId)
    const element = document.getElementById(`source-${sourceId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleDownloadReport = () => {
    if (!report) return
    downloadReport(report, clues, audioClues)
  }

  const handleRetry = () => {
    if (!id) return
    resetCaseState()
    setCurrentCase(id)
    navigate(`/case/${id}`)
  }

  const handleBackToHome = () => {
    navigate('/')
  }

  const handleNextCase = () => {
    if (!id) return
    const caseData = getCaseById(id)
    if (!caseData) return

    const allCases = [
      'case-001',
      'case-002',
      'case-003',
      'case-004',
    ]
    const currentIndex = allCases.indexOf(id)
    if (currentIndex < allCases.length - 1) {
      const nextId = allCases[currentIndex + 1]
      resetCaseState()
      setCurrentCase(nextId)
      navigate(`/case/${nextId}`)
    } else {
      navigate('/')
    }
  }

  if (!report || !caseData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-xl">暂无复盘数据，请先完成案件调查</div>
        </div>
      </div>
    )
  }

  const isCorrect = report.userJudgment.isCorrect
  const errorAnalysis = report.errorAnalysis
  const combinationAnalysis = report.clueCombinationAnalysis

  const getClueLabel = (clueId: string) => {
    const clue = CLUES.find((c) => c.id === clueId)
    if (clue) return `[理论] ${clue.content.substring(0, 20)}...`
    const audio = AUDIO_CLUES.find((a) => a.id === clueId)
    if (audio) return `[音频] ${audio.name}`
    return clueId
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(`/case/${id}`)}
            className="flex items-center gap-2 text-primary-300 hover:text-accent-gold mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回案件
          </button>

          <div
            className={`parchment-card p-8 mb-8 ${
              isCorrect ? 'border-success' : 'border-error'
            }`}
            style={{ borderWidth: '3px' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isCorrect ? 'bg-success/20' : 'bg-error/20'
                  }`}
                >
                  {isCorrect ? (
                    <Trophy className="w-8 h-8 text-success" />
                  ) : (
                    <XCircle className="w-8 h-8 text-error" />
                  )}
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-bold text-primary-800 mb-1">
                    {report.caseTitle}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span
                      className={`tag-badge ${
                        isCorrect ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                      }`}
                    >
                      {isCorrect ? '推理正确' : '推理有误'}
                    </span>
                    {errorAnalysis && errorAnalysis.type !== 'correct' && (
                      <span className={`error-tag error-${errorAnalysis.type}`}>
                        <AlertTriangle className="w-3 h-3 mr-1 inline" />
                        {errorAnalysis.typeLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-primary-500 mb-1">最终得分</div>
                <div
                  className={`text-5xl font-bold font-serif ${
                    isCorrect ? 'text-success' : 'text-error'
                  }`}
                >
                  {report.userJudgment.score}
                  <span className="text-2xl text-primary-400 font-normal">/100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="parchment-card p-6">
                <h2 className="font-serif text-xl font-bold text-primary-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-gold" />
                  判断详情
                </h2>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-parchment-100">
                    <div className="text-sm text-primary-500 mb-1">你的答案</div>
                    <div
                      className={`font-medium text-lg ${
                        isCorrect ? 'text-success' : 'text-error'
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 inline mr-2" />
                      ) : (
                        <X className="w-5 h-5 inline mr-2" />
                      )}
                      {report.selectedAnswer.label}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="text-sm text-success mb-1">正确答案</div>
                    <div className="font-medium text-lg text-success">
                      <CheckCircle2 className="w-5 h-5 inline mr-2" />
                      {report.correctAnswer.label}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-parchment-100">
                    <div className="text-sm text-primary-500 mb-2">答案解析</div>
                    <p className="text-primary-700 leading-relaxed">
                      {report.correctAnswer.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {errorAnalysis && errorAnalysis.type !== 'correct' && (
                <div className="parchment-card p-6 border-l-4 border-l-error">
                  <h2 className="font-serif text-xl font-bold text-primary-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-error" />
                    错因分析
                  </h2>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-error/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`error-tag error-${errorAnalysis.type}`}>
                          {errorAnalysis.typeLabel}
                        </span>
                      </div>
                      <p className="text-primary-700 leading-relaxed">
                        {errorAnalysis.description}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-success">改进建议</span>
                      </div>
                      <p className="text-primary-700">{errorAnalysis.suggestion}</p>
                    </div>

                    {errorAnalysis.sourceTrace.length > 0 && (
                      <div className="p-4 rounded-lg bg-parchment-100">
                        <div className="text-sm font-medium text-primary-800 mb-3 flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-accent-gold" />
                          来源追溯（点击跳转原始线索）
                        </div>
                        <div className="space-y-2">
                          {errorAnalysis.sourceTrace.map((trace, index) => (
                            <button
                              key={index}
                              onClick={() => handleSourceClick(trace.id)}
                              className="w-full text-left p-3 rounded-lg bg-parchment-50 border border-parchment-300 hover:border-accent-gold hover:bg-accent-gold/5 transition-all group"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-6 h-6 rounded-full bg-accent-gold/20 flex items-center justify-center">
                                  {trace.type === 'clue' ? (
                                    <FileText className="w-3 h-3 text-accent-gold" />
                                  ) : (
                                    <Volume2 className="w-3 h-3 text-accent-gold" />
                                  )}
                                </span>
                                <span className="text-xs text-primary-500">
                                  {trace.type === 'clue' ? '文字线索' : '音频线索'}
                                </span>
                              </div>
                              <p className="text-sm text-primary-700 group-hover:text-accent-gold transition-colors">
                                {trace.reference}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="parchment-card p-6">
                <h2 className="font-serif text-xl font-bold text-primary-800 mb-4 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-accent-gold" />
                  线索组合分析
                  <span className="ml-auto text-sm font-normal text-primary-500">
                    组合得分：
                    <span className="font-bold text-accent-gold">
                      {combinationAnalysis.combinationScore}
                    </span>
                    /100
                  </span>
                </h2>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-parchment-100">
                    <div className="text-sm font-medium text-primary-800 mb-2">
                      你的推理链
                    </div>
                    <div className="space-y-1">
                      {combinationAnalysis.userCombination.length > 0 ? (
                        combinationAnalysis.userCombination.map((id, index) => {
                          const isMissing = combinationAnalysis.missingClues.includes(id)
                          const isRedundant = combinationAnalysis.redundantClues.includes(id)
                          const isDuplicate = combinationAnalysis.duplicateClues.some(
                            (d) => d.id === id
                          )

                          return (
                            <div
                              key={`${id}-${index}`}
                              className={`flex items-center gap-2 p-2 rounded text-sm ${
                                isDuplicate
                                  ? 'bg-orange-100 text-orange-700'
                                  : isRedundant
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-success/10 text-success'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                              <span className="flex-1 truncate">{getClueLabel(id)}</span>
                              {isDuplicate && (
                                <Copy className="w-3 h-3" title="重复线索" />
                              )}
                              {isRedundant && (
                                <X className="w-3 h-3" title="冗余线索" />
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-primary-500 text-sm">未选择任何线索</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="text-sm font-medium text-success mb-2">
                      正确推理链
                    </div>
                    <div className="space-y-1">
                      {combinationAnalysis.correctCombination.map((id, index) => (
                        <div
                          key={id}
                          className="flex items-center gap-2 p-2 rounded text-sm bg-success/20 text-success"
                        >
                          <span className="w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="flex-1 truncate">{getClueLabel(id)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-lg ${
                      combinationAnalysis.missingClues.length > 0
                        ? 'bg-error/10 border border-error/30'
                        : 'bg-parchment-100'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-2 ${
                        combinationAnalysis.missingClues.length > 0
                          ? 'text-error'
                          : 'text-primary-500'
                      }`}
                    >
                      缺失关键线索
                    </div>
                    {combinationAnalysis.missingClues.length > 0 ? (
                      <div className="space-y-1">
                        {combinationAnalysis.missingClues.map((id) => (
                          <div
                            key={id}
                            className="text-xs text-error p-1.5 rounded bg-error/10"
                          >
                            {getClueLabel(id)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-success">✓ 无缺失</p>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      combinationAnalysis.redundantClues.length > 0
                        ? 'bg-error/10 border border-error/30'
                        : 'bg-parchment-100'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-2 ${
                        combinationAnalysis.redundantClues.length > 0
                          ? 'text-error'
                          : 'text-primary-500'
                      }`}
                    >
                      冗余/无关线索
                    </div>
                    {combinationAnalysis.redundantClues.length > 0 ? (
                      <div className="space-y-1">
                        {combinationAnalysis.redundantClues.map((id) => (
                          <div
                            key={id}
                            className="text-xs text-error p-1.5 rounded bg-error/10"
                          >
                            {getClueLabel(id)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-success">✓ 无冗余</p>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      combinationAnalysis.duplicateClues.length > 0
                        ? 'bg-orange-100 border border-orange-300'
                        : 'bg-parchment-100'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-2 ${
                        combinationAnalysis.duplicateClues.length > 0
                          ? 'text-orange-700'
                          : 'text-primary-500'
                      }`}
                    >
                      重复线索
                    </div>
                    {combinationAnalysis.duplicateClues.length > 0 ? (
                      <div className="space-y-1">
                        {combinationAnalysis.duplicateClues.map((d, index) => (
                          <div
                            key={index}
                            className="text-xs text-orange-700 p-1.5 rounded bg-orange-50"
                          >
                            <Copy className="w-3 h-3 inline mr-1" />
                            {getClueLabel(d.id)}
                            <br />
                            <span className="text-xs text-orange-500">
                              ↳ 重复于 {getClueLabel(d.duplicateOf)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-success">✓ 无重复</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="parchment-card p-6">
                <h2 className="font-serif text-xl font-bold text-primary-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-gold" />
                  原始线索回顾
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-primary-600 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      文字线索
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {clues.map((clue) => (
                        <div key={clue.id} id={`source-${clue.id}`}>
                          <ClueCard clue={clue} showSource={true} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary-600 mb-3 flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      音频线索
                    </h3>
                    <div className="space-y-4">
                      {audioClues.map((audioClue) => (
                        <div key={audioClue.id} id={`source-${audioClue.id}`}>
                          <AudioClueCard
                            audioClue={audioClue}
                            showFingerprint={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-24 space-y-6">
                <div className="parchment-card p-6">
                  <h3 className="font-serif font-bold text-primary-800 mb-4">操作</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleDownloadReport}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      导出结案报告
                    </button>
                    <button
                      onClick={handleRetry}
                      className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      重新调查此案
                    </button>
                    <button
                      onClick={handleNextCase}
                      className="btn-outline w-full flex items-center justify-center gap-2"
                    >
                      下一案件
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleBackToHome}
                      className="w-full py-3 text-primary-500 hover:text-accent-gold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Home className="w-5 h-5" />
                      返回案件大厅
                    </button>
                  </div>
                </div>

                <div className="parchment-card-dark p-6">
                  <h3 className="font-serif font-bold text-primary-800 mb-4">
                    测试样例验证
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-primary-600">场景类型</span>
                      <span className="tag-badge bg-primary-100 text-primary-700">
                        {caseData.tags[0]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary-600">错误类型检测</span>
                      <span
                        className={`tag-badge ${
                          errorAnalysis?.type === caseData.expectedErrorType
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        {errorAnalysis?.type === caseData.expectedErrorType ||
                        (isCorrect && !caseData.expectedErrorType)
                          ? '✓ 匹配'
                          : '✗ 不匹配'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary-600">线索重复检测</span>
                      <span
                        className={`tag-badge ${
                          combinationAnalysis.duplicateClues.length > 0 ||
                          caseData.id !== 'case-004'
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        {caseData.id === 'case-004'
                          ? combinationAnalysis.duplicateClues.length > 0
                            ? '✓ 已检测'
                            : '✗ 未检测'
                          : '✓ 不适用'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary-600">来源追溯</span>
                      <span className="tag-badge bg-success/20 text-success">
                        {errorAnalysis?.sourceTrace.length || 0} 条
                      </span>
                    </div>
                  </div>

                  {errorAnalysis && (
                    <div className="mt-4 p-3 bg-primary-800/10 rounded-lg">
                      <p className="text-xs text-primary-600">
                        <span className="font-medium">验证说明：</span>
                        {isCorrect
                          ? '基础流程验证通过，正常记录分支生效。'
                          : caseData.id === 'case-002' && errorAnalysis.type === 'inversion_misjudgment'
                          ? '转位误判分支验证通过，系统正确识别了转位错误。'
                          : caseData.id === 'case-003' && errorAnalysis.type === 'enharmonic_confusion'
                          ? '同名调混淆分支验证通过，系统正确识别了大小调混淆。'
                          : caseData.id === 'case-004' && errorAnalysis.type === 'duplicate_clue'
                          ? '线索重复分支验证通过，系统正确识别了重复线索并拒绝合并。'
                          : '其他错误类型，需检查输入。'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ReviewPage
