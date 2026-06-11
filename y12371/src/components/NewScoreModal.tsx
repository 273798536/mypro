import { useState, useRef } from 'react'
import { Upload, Music, User, FileText, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import { useScoreStore } from '../store/scoreStore'
import { generateId } from '../utils/helpers'
import type { Score, Version } from '../types'

interface NewScoreModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'create' | 'import'
}

export default function NewScoreModal({ isOpen, onClose, mode = 'create' }: NewScoreModalProps) {
  const { addScore, addVersion } = useScoreStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    pdfFileName: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileSelect = () => {
    setFileError('')
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('仅支持 PDF 格式文件，请重新选择')
      setSelectedFile(null)
      setFormData(prev => ({ ...prev, pdfFileName: '' }))
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      setFileError('文件大小不能超过 100MB')
      setSelectedFile(null)
      setFormData(prev => ({ ...prev, pdfFileName: '' }))
      return
    }

    setFileError('')
    setSelectedFile(file)
    setFormData(prev => ({ ...prev, pdfFileName: file.name }))
  }

  const canSubmit = () => {
    if (!formData.title.trim() || !formData.composer.trim()) return false
    if (mode === 'import' && !selectedFile) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) return

    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 800))

    const scoreId = generateId()
    const now = new Date().toISOString()
    const pdfUrl = selectedFile
      ? URL.createObjectURL(selectedFile)
      : `/scores/${scoreId}.pdf`

    const newScore: Score = {
      id: scoreId,
      title: formData.title.trim(),
      composer: formData.composer.trim(),
      status: 'pending',
      pdfUrl: selectedFile ? selectedFile.name : pdfUrl,
      createdAt: now,
      updatedAt: now,
    }

    const newVersion: Version = {
      id: generateId(),
      scoreId,
      versionNumber: 1,
      pdfUrl: selectedFile ? selectedFile.name : pdfUrl,
      source: mode === 'import' ? `导入上传 - ${selectedFile?.name ?? ''}` : '手动创建',
      createdAt: now,
      note: selectedFile
        ? `初始版本 (文件: ${selectedFile.name}, ${(selectedFile.size / 1024).toFixed(1)}KB)`
        : '初始版本',
    }

    addScore(newScore)
    addVersion(newVersion)

    setFormData({ title: '', composer: '', pdfFileName: '' })
    setSelectedFile(null)
    setFileError('')
    setIsSubmitting(false)
    onClose()
  }

  const handleClose = () => {
    if (isSubmitting) return
    setFormData({ title: '', composer: '', pdfFileName: '' })
    setSelectedFile(null)
    setFileError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'import' ? '导入曲谱' : '新建曲谱'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === 'import' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label className="block text-sm font-medium text-navy-300 mb-2">
              上传PDF文件 *
            </label>
            <div
              onClick={handleFileSelect}
              className="border-2 border-dashed border-navy-600 rounded-xl p-8 text-center cursor-pointer hover:border-gold-500/50 hover:bg-navy-700/30 transition-all"
            >
              <Upload className="w-10 h-10 mx-auto text-navy-500 mb-3" />
              {selectedFile ? (
                <div>
                  <p className="text-gold-400 font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-navy-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-navy-500 mt-1">点击重新选择</p>
                </div>
              ) : (
                <div>
                  <p className="text-navy-300">点击选择PDF文件</p>
                  <p className="text-xs text-navy-500 mt-1">支持 .pdf 格式，最大 100MB</p>
                </div>
              )}
            </div>
            {fileError && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-navy-300 mb-2">
            <Music className="w-4 h-4 inline mr-2" />
            曲谱名称 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="例如：贝多芬第九交响曲"
            className="w-full px-4 py-3 bg-navy-900/50 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-300 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            作曲家 *
          </label>
          <input
            type="text"
            value={formData.composer}
            onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
            placeholder="例如：贝多芬"
            className="w-full px-4 py-3 bg-navy-900/50 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all"
            required
          />
        </div>

        {mode === 'create' && (
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              PDF文件名（可选）
            </label>
            <input
              type="text"
              value={formData.pdfFileName}
              onChange={(e) => setFormData({ ...formData, pdfFileName: e.target.value })}
              placeholder="留空将自动生成"
              className="w-full px-4 py-3 bg-navy-900/50 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 font-medium rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting || !canSubmit()}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                处理中...
              </>
            ) : mode === 'import' ? (
              '导入'
            ) : (
              '创建'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
