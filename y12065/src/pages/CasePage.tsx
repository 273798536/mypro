import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Volume2, Gavel, AlertCircle } from 'lucide-react'
import Header from '@/components/Header'
import ClueCard from '@/components/ClueCard'
import AudioClueCard from '@/components/AudioClueCard'
import AnswerOption from '@/components/AnswerOption'
import ClueChain from '@/components/ClueChain'
import { useGameStore } from '@/store/gameStore'
import { DIFFICULTY_LABELS } from '@/types'

const CasePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getCurrentCaseData,
    setCurrentCase,
    selectedClueIds,
    selectedAudioClueIds,
    selectedAnswerId,
    submitJudgment,
  } = useGameStore()

  useEffect(() => {
    if (id) {
      setCurrentCase(id)
    }
  }, [id, setCurrentCase])

  const { caseData, clues, audioClues, answerOptions } = getCurrentCaseData()

  useEffect(() => {
    if (caseData) {
      document.title = `${caseData.title} - 乐理和弦侦探`
    }
  }, [caseData])

  const handleSubmit = () => {
    if (!selectedAnswerId) {
      alert('请先选择一个答案')
      return
    }
    if (selectedClueIds.length === 0 && selectedAudioClueIds.length === 0) {
      if (!confirm('你还没有选择任何线索，确定要提交吗？')) {
        return
      }
    }

    const result = submitJudgment()
    if (result.success && id) {
      navigate(`/case/${id}/review`)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-xl">案件不存在</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-primary-300 hover:text-accent-gold mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回案件大厅
          </button>

          <div className="parchment-card p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`tag-badge tag-difficulty-${caseData.difficulty}`}>
                    {DIFFICULTY_LABELS[caseData.difficulty]}
                  </span>
                  {caseData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="tag-badge bg-primary-100 text-primary-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="font-serif text-2xl font-bold text-primary-800">
                  {caseData.title}
                </h1>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-500">训练目标</p>
                <p className="font-medium text-primary-700">{caseData.targetConcept}</p>
              </div>
            </div>

            <div className="p-4 bg-parchment-100 rounded-lg border-l-4 border-accent-gold">
              <h3 className="font-serif font-bold text-primary-800 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-gold" />
                案情简报
              </h3>
              <p className="text-primary-700 leading-relaxed">{caseData.brief}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-serif text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-gold" />
                  线索本
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {clues.map((clue) => (
                    <ClueCard
                      key={clue.id}
                      clue={clue}
                      showSource={true}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-serif text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-accent-gold" />
                  音频线索
                </h2>
                <div className="space-y-4">
                  {audioClues.map((audioClue) => (
                    <AudioClueCard
                      key={audioClue.id}
                      audioClue={audioClue}
                      showFingerprint={false}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-serif text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-accent-gold" />
                  做出判断
                </h2>
                <div className="parchment-card p-6">
                  <div className="space-y-3 mb-6">
                    {answerOptions.map((option) => (
                      <AnswerOption key={option.id} option={option} />
                    ))}
                  </div>

                  {selectedAnswerId && (
                    <div className="p-4 bg-accent-gold/10 rounded-lg border border-accent-gold/30 mb-6">
                      <p className="text-sm text-primary-700">
                        <AlertCircle className="w-4 h-4 inline mr-1 text-accent-gold" />
                        你已选择答案，请确认线索组合无误后提交。
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!selectedAnswerId}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Gavel className="w-5 h-5" />
                    提交判断
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-24">
                <div className="parchment-card p-6">
                  <ClueChain />

                  <div className="mt-6 pt-6 border-t border-parchment-300">
                    <h4 className="font-serif font-bold text-primary-800 mb-3">
                      选择统计
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-primary-600">文字线索</span>
                        <span className="font-medium text-primary-800">
                          {selectedClueIds.length} 条
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-600">音频线索</span>
                        <span className="font-medium text-primary-800">
                          {selectedAudioClueIds.length} 条
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-600">答案已选</span>
                        <span
                          className={`font-medium ${
                            selectedAnswerId ? 'text-success' : 'text-error'
                          }`}
                        >
                          {selectedAnswerId ? '✓ 已选择' : '✗ 未选择'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-parchment-300">
                    <h4 className="font-serif font-bold text-primary-800 mb-3">
                      提示
                    </h4>
                    <ul className="text-xs text-primary-600 space-y-2">
                      <li>• 点击线索卡片可添加/移除推理链</li>
                      <li>• 关键线索标记有金色边框</li>
                      <li>• 红色边框为陷阱线索，需小心</li>
                      <li>• 重复线索会被系统检测并扣分</li>
                      <li>• 复盘时可点击来源追溯原始线索</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CasePage
