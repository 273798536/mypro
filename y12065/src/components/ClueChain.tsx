import { ArrowRight, X, Link2, AlertTriangle, Copy } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { CLUES, AUDIO_CLUES } from '@/data/mockData'
import { detectDuplicateAudioClues, detectDuplicateClues } from '@/utils/clueEngine'

const ClueChain = () => {
  const {
    selectedClueIds,
    selectedAudioClueIds,
    toggleClueSelection,
    toggleAudioClueSelection,
  } = useGameStore()

  const allClues = [...selectedClueIds, ...selectedAudioClueIds]

  const duplicateClues = [
    ...detectDuplicateClues(CLUES, selectedClueIds),
    ...detectDuplicateAudioClues(AUDIO_CLUES, selectedAudioClueIds),
  ]

  const isDuplicate = (id: string) => duplicateClues.some((d) => d.id === id)

  const getClueLabel = (id: string) => {
    const clue = CLUES.find((c) => c.id === id)
    if (clue) return clue.content.substring(0, 25) + '...'

    const audio = AUDIO_CLUES.find((a) => a.id === id)
    if (audio) return `[音频] ${audio.name}`

    return id
  }

  const getClueType = (id: string): 'clue' | 'audio' => {
    return CLUES.some((c) => c.id === id) ? 'clue' : 'audio'
  }

  const handleRemove = (id: string) => {
    const type = getClueType(id)
    if (type === 'clue') {
      toggleClueSelection(id)
    } else {
      toggleAudioClueSelection(id)
    }
  }

  if (allClues.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-parchment-300 rounded-lg bg-parchment-50/50">
        <Link2 className="w-8 h-8 text-primary-400 mx-auto mb-2" />
        <p className="text-primary-500 text-sm">
          点击左侧线索卡片，将线索添加到推理链中
        </p>
        <p className="text-primary-400 text-xs mt-1">
          组合正确的关键线索可以获得更高分数
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-serif font-bold text-primary-800 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-accent-gold" />
          推理链
          <span className="text-sm font-normal text-primary-500">
            ({allClues.length} 条线索)
          </span>
        </h4>
        {duplicateClues.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            检测到 {duplicateClues.length} 条重复线索
          </span>
        )}
      </div>

      <div className="space-y-2">
        {allClues.map((id, index) => {
          const type = getClueType(id)
          const duplicate = duplicateClues.find((d) => d.id === id)

          return (
            <div key={`${id}-${index}`} className="relative animate-slide-up">
              {index > 0 && (
                <div className="absolute -top-2 left-4 text-accent-gold">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3 rounded-lg border-2 flex items-center justify-between group ${
                  isDuplicate(id)
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-accent-gold/50 bg-parchment-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent-gold text-primary-800 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm text-primary-800">
                      {getClueLabel(id)}
                    </p>
                    <p className="text-xs text-primary-500">
                      {type === 'clue' ? '文字线索' : '音频线索'}
                      {duplicate && (
                        <span className="ml-2 flex items-center gap-1 text-orange-600 inline-flex">
                          <Copy className="w-3 h-3" />
                          重复
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(id)}
                  className="p-1 rounded-full hover:bg-error/10 text-primary-400 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ClueChain
