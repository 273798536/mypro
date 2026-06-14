import { useParams, Link, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { useMistakeData } from '../hooks/useMistakeData'
import { ProcessStatus } from '../types'
import StatusBadge from '../components/StatusBadge'
import UnitCheckPanel from '../components/UnitCheckPanel'
import JumpAnalysisPanel from '../components/JumpAnalysisPanel'
import AttachmentList from '../components/AttachmentList'
import AddAttachmentForm from '../components/AddAttachmentForm'
import ManualConfirmPanel from '../components/ManualConfirmPanel'
import SourceInfoPanel from '../components/SourceInfoPanel'
import ExportButton from '../components/ExportButton'

const difficultyLabel = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
}

const difficultyColor = {
  easy: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  hard: 'text-red-600 bg-red-50'
}

export default function MistakeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getMistakeById, updateMistakeStatus, addAttachment } = useMistakeData()
  const exportRef = useRef<HTMLDivElement>(null)

  const mistake = getMistakeById(id || '')

  if (!mistake) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">❓</div>
        <p className="text-gray-500 mb-4">未找到该错题记录</p>
        <Link
          to="/mistakes"
          className="text-primary-600 hover:text-primary-700 text-sm"
        >
          ← 返回列表
        </Link>
      </div>
    )
  }

  const handleMarkReviewed = () => {
    updateMistakeStatus(mistake.id, ProcessStatus.REVIEWED)
  }

  const handleMarkCompleted = () => {
    updateMistakeStatus(mistake.id, ProcessStatus.COMPLETED)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/mistakes"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <span>←</span> 返回错题列表
        </Link>
        
        <div className="flex items-center gap-2">
          <ExportButton targetRef={exportRef} filename={`错题${mistake.queueNumber}_${mistake.title}`} />
        </div>
      </div>

      <div ref={exportRef} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                <span className="text-xl font-bold text-primary-600">#{mistake.queueNumber}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{mistake.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{mistake.subject}</span>
                  <span>·</span>
                  <span>{mistake.chapter}</span>
                  <span>·</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColor[mistake.difficulty]}`}>
                    {difficultyLabel[mistake.difficulty]}
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge status={mistake.status} />
          </div>

          {mistake.tags && mistake.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mistake.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 题目内容</h3>
                <p className="text-sm text-gray-800 leading-relaxed">{mistake.questionContent}</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📐 相关公式</h3>
                <div className="bg-white rounded p-3 font-mono text-sm text-gray-800 border border-gray-200">
                  {mistake.formula}
                </div>
                {mistake.formulaUnit && (
                  <p className="text-xs text-gray-500 mt-2">
                    公式单位: <span className="font-mono">{mistake.formulaUnit}</span>
                  </p>
                )}
              </div>

              <UnitCheckPanel
                unitCheck={mistake.unitCheck}
                formulaUnit={mistake.formulaUnit}
                studentUnit={mistake.studentAnswer?.unit}
                correctUnit={mistake.correctAnswer?.unit}
              />
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-xs font-semibold text-blue-700 mb-2">📝 学生答案</h3>
                  {mistake.studentAnswer ? (
                    <>
                      <p className="text-lg font-bold text-blue-800 font-mono">
                        {mistake.studentAnswer.value}
                        <span className="text-sm ml-1">{mistake.studentAnswer.unit || ''}</span>
                      </p>
                      {mistake.studentAnswer.rawText && (
                        <p className="text-xs text-blue-600 mt-1">
                          原始: {mistake.studentAnswer.rawText}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">暂无</p>
                  )}
                </div>

                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <h3 className="text-xs font-semibold text-green-700 mb-2">✅ 参考答案</h3>
                  {mistake.correctAnswer ? (
                    <>
                      <p className="text-lg font-bold text-green-800 font-mono">
                        {mistake.correctAnswer.value}
                        <span className="text-sm ml-1">{mistake.correctAnswer.unit || ''}</span>
                      </p>
                      {mistake.correctAnswer.rawText && (
                        <p className="text-xs text-green-600 mt-1">
                          原始: {mistake.correctAnswer.rawText}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">暂无</p>
                  )}
                </div>
              </div>

              {mistake.manualConfirm && (
                <ManualConfirmPanel confirmInfo={mistake.manualConfirm} />
              )}

              {mistake.jumpAnalysis && (
                <JumpAnalysisPanel
                  hasJump={mistake.jumpAnalysis.hasJump}
                  jumpFactors={mistake.jumpAnalysis.jumpFactors}
                  summary={mistake.jumpAnalysis.summary}
                />
              )}

              <AttachmentList
                attachments={mistake.attachments}
                lateAttachmentImpact={mistake.lateAttachmentImpact}
              />
              <AddAttachmentForm mistakeId={mistake.id} onAdd={addAttachment} />
            </div>
          </div>

          <SourceInfoPanel
            dataSource={mistake.dataSource}
            fieldMappingNotes={mistake.fieldMappingNotes}
            submittedBy={mistake.submittedBy}
            createdAt={mistake.createdAt}
            updatedAt={mistake.updatedAt}
          />

          {mistake.reviewNotes && (
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 复盘笔记</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{mistake.reviewNotes}</p>
              {mistake.reviewer && (
                <p className="text-xs text-gray-400 mt-2 text-right">
                  — {mistake.reviewer}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          {mistake.status === 'needs_manual_confirm' && (
            <button
              onClick={handleMarkReviewed}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors"
            >
              已确认，标记为已复盘
            </button>
          )}
          {(mistake.status === 'reviewed' || mistake.status === 'processing') && (
            <button
              onClick={handleMarkCompleted}
              className="px-4 py-2 text-sm font-medium text-white bg-success-500 rounded-md hover:bg-success-600 transition-colors"
            >
              标记为已完成
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        💡 <strong>提示：</strong>点击右上角「导出截图」可将本页面导出为图片，页面上显示的状态、单位校验结果、附件信息都会与导出文件保持一致。
      </div>
    </div>
  )
}
