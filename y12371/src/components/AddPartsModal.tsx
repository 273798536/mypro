import { useState } from 'react'
import { Upload, Plus, Trash2, FileSpreadsheet } from 'lucide-react'
import Modal from './Modal'
import { useScoreStore } from '../store/scoreStore'
import { generateId } from '../utils/helpers'
import type { Part } from '../types'

interface AddPartsModalProps {
  isOpen: boolean
  onClose: () => void
  scoreId: string
}

const defaultPart = {
  name: '',
  instrument: '',
  measureRange: '',
}

export default function AddPartsModal({ isOpen, onClose, scoreId }: AddPartsModalProps) {
  const { addPart, updateScore, getScoreById } = useScoreStore()
  const [parts, setParts] = useState<Array<{ name: string; instrument: string; measureRange: string }>>([
    { ...defaultPart },
  ])
  const [fileName, setFileName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileSelect = () => {
    setFileName(`parts_list_${Date.now()}.xlsx`)
  }

  const addPartRow = () => {
    setParts([...parts, { ...defaultPart }])
  }

  const removePartRow = (index: number) => {
    if (parts.length > 1) {
      setParts(parts.filter((_, i) => i !== index))
    }
  }

  const updatePartRow = (index: number, field: string, value: string) => {
    const newParts = [...parts]
    newParts[index] = { ...newParts[index], [field]: value }
    setParts(newParts)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validParts = parts.filter((p) => p.name.trim() && p.instrument.trim())
    if (validParts.length === 0 && !fileName) return

    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    validParts.forEach((partData) => {
      const newPart: Part = {
        id: generateId(),
        scoreId,
        name: partData.name,
        instrument: partData.instrument,
        measureRange: partData.measureRange || '1-999',
        confirmed: false,
      }
      addPart(newPart)
    })

    if (fileName) {
      const score = getScoreById(scoreId)
      if (score && !score.partListUrl) {
        updateScore(scoreId, {
          partListUrl: `/scores/${fileName}`,
        })
      }
    }

    setParts([{ ...defaultPart }])
    setFileName('')
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="补充声部清单" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-navy-300 mb-2">
            上传声部清单文件（可选）
          </label>
          <div
            onClick={handleFileSelect}
            className="border-2 border-dashed border-navy-600 rounded-xl p-6 text-center cursor-pointer hover:border-gold-500/50 hover:bg-navy-700/30 transition-all"
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto text-navy-500 mb-3" />
            {fileName ? (
              <div>
                <p className="text-gold-400 font-medium">{fileName}</p>
                <p className="text-xs text-navy-500 mt-1">点击重新选择</p>
              </div>
            ) : (
              <div>
                <p className="text-navy-300">点击上传声部清单文件</p>
                <p className="text-xs text-navy-500 mt-1">支持 .xlsx, .csv 格式</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-navy-700 pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-navy-300">或手动添加声部</label>
            <button
              type="button"
              onClick={addPartRow}
              className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加声部
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {parts.map((part, index) => (
              <div key={index} className="flex items-center gap-3 bg-navy-900/50 p-3 rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="声部名称 *"
                    value={part.name}
                    onChange={(e) => updatePartRow(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="乐器 *"
                    value={part.instrument}
                    onChange={(e) => updatePartRow(index, 'instrument', e.target.value)}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 text-sm"
                  />
                </div>
                <div className="w-28">
                  <input
                    type="text"
                    placeholder="小节范围"
                    value={part.measureRange}
                    onChange={(e) => updatePartRow(index, 'measureRange', e.target.value)}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePartRow(index)}
                  className="p-2 text-navy-500 hover:text-red-400 transition-colors"
                  disabled={parts.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-700">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 font-medium rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting || (parts.every((p) => !p.name.trim() || !p.instrument.trim()) && !fileName)}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                处理中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
