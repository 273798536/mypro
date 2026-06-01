import { Link } from 'react-router-dom'
import { FileText, Users, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import type { Score } from '../types'
import { getStatusLabel, getStatusColor, formatDate } from '../utils/helpers'

interface ScoreCardProps {
  score: Score
  versionCount: number
  annotationCount: number
  partCount: number
  anomalyCount: number
}

export default function ScoreCard({
  score,
  versionCount,
  annotationCount,
  partCount,
  anomalyCount,
}: ScoreCardProps) {
  return (
    <Link
      to={`/score/${score.id}`}
      className="group block bg-navy-800/50 rounded-xl overflow-hidden border border-navy-700/50 hover:border-gold-500/30 transition-all duration-300 card-hover"
    >
      {/* 卡片头部 */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-semibold text-white truncate group-hover:text-gold-400 transition-colors">
              {score.title}
            </h3>
            <p className="text-sm text-navy-400 mt-1">{score.composer}</p>
          </div>
          <span
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
              score.status
            )}`}
          >
            {getStatusLabel(score.status)}
          </span>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gold-400">
              <FileText className="w-4 h-4" />
              <span className="font-semibold">{versionCount}</span>
            </div>
            <p className="text-xs text-navy-500 mt-1">版本</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{partCount}</span>
            </div>
            <p className="text-xs text-navy-500 mt-1">声部</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-400">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{annotationCount}</span>
            </div>
            <p className="text-xs text-navy-500 mt-1">批注</p>
          </div>
          <div className="text-center">
            <div
              className={`flex items-center justify-center gap-1 ${
                anomalyCount > 0 ? 'text-red-400' : 'text-navy-500'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="font-semibold">{anomalyCount}</span>
            </div>
            <p className="text-xs text-navy-500 mt-1">异常</p>
          </div>
        </div>
      </div>

      {/* 卡片底部 */}
      <div className="px-5 py-3 bg-navy-900/50 border-t border-navy-700/50 flex items-center justify-between">
        <span className="text-xs text-navy-500">
          更新于 {formatDate(score.updatedAt)}
        </span>
        <div className="flex items-center gap-1 text-gold-400 text-sm font-medium">
          查看详情
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
