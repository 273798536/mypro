import { Link } from 'react-router-dom'
import type { MistakeRecord } from '../types'
import StatusBadge from './StatusBadge'
import { DataSourceLabel } from '../types'

interface MistakeCardProps {
  mistake: MistakeRecord
}

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

export default function MistakeCard({ mistake }: MistakeCardProps) {
  const hasUnitIssue = !mistake.unitCheck.passed
  const hasLateAttachment = mistake.attachments.some(a => a.isLateArrival)
  const hasJump = mistake.jumpAnalysis?.hasJump

  return (
    <Link
      to={`/mistakes/${mistake.id}`}
      className="block bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
              {mistake.queueNumber}
            </span>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                {mistake.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>{mistake.subject}</span>
                <span>·</span>
                <span>{mistake.chapter}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={mistake.status} size="sm" />
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {mistake.questionContent}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColor[mistake.difficulty]}`}>
              {difficultyLabel[mistake.difficulty]}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {DataSourceLabel[mistake.dataSource]}
            </span>
            {hasUnitIssue && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning-100 text-warning-600 flex items-center gap-1">
                ⚠️ 单位问题
              </span>
            )}
            {hasLateAttachment && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-600 flex items-center gap-1">
                📎 晚到附件
              </span>
            )}
            {hasJump && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-danger-100 text-danger-600 flex items-center gap-1">
                ↕️ 结果跳变
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-400">
            {mistake.createdAt.slice(0, 10)}
          </div>
        </div>
      </div>

      <div className="h-1 bg-gray-50 flex">
        {hasUnitIssue && <div className="h-full bg-warning-400 flex-1" />}
        {hasLateAttachment && <div className="h-full bg-purple-400 flex-1" />}
        {hasJump && <div className="h-full bg-danger-400 flex-1" />}
        {!hasUnitIssue && !hasLateAttachment && !hasJump && (
          <div className="h-full bg-success-400 flex-1" />
        )}
      </div>
    </Link>
  )
}
