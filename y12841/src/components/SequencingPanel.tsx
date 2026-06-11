import type { SequencingResult } from '../types'
import { User, Clock, AlertTriangle } from 'lucide-react'

interface SequencingPanelProps {
  result: SequencingResult
}

export default function SequencingPanel({ result }: SequencingPanelProps) {
  const isModified = result.previousConclusion !== null

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="section-title">测序结果</h3>
        {isModified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            结论已修改
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <User className="h-4 w-4 text-teal-700" />
            <span>维护人：<strong className="text-slate-800">{result.maintainer}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="h-4 w-4 text-teal-700" />
            <span>创建时间：<span className="font-mono text-slate-800">{result.originalCreatedAt}</span></span>
          </div>
          {isModified && (
            <div className="flex items-center gap-2 text-amber-700">
              <Clock className="h-4 w-4" />
              <span>修改时间：<span className="font-mono">{result.modifiedAt}</span></span>
            </div>
          )}
        </div>

        {isModified && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="mb-1 text-xs font-medium text-slate-400">旧结论</p>
              <p className="text-sm text-slate-600 line-through">{result.previousConclusion}</p>
            </div>
            <div className="rounded-lg bg-white border border-amber-300 p-3">
              <p className="mb-1 text-xs font-medium text-amber-600">新结论</p>
              <p className="text-sm text-slate-800 font-medium">{result.conclusion}</p>
            </div>
          </div>
        )}

        {!isModified && (
          <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 p-3">
            <p className="text-sm text-emerald-800 font-medium">{result.conclusion}</p>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">测序质量概览</p>
          <div className="flex items-end gap-1 h-16">
            {result.data.map((point, i) => {
              const height = (point.quality - 0.5) * 200
              const isLow = point.quality < 0.75
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    isLow ? 'bg-red-300' : point.quality < 0.85 ? 'bg-amber-300' : 'bg-teal-600'
                  }`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`位点${point.position}: 质量${(point.quality * 100).toFixed(1)}%`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400">位点 1</span>
            <span className="text-xs text-slate-400">位点 {result.data.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
