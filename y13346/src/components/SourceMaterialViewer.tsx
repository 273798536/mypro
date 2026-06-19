import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileCode, FileText, GitPullRequest, ScrollText, ExternalLink } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTime, riskLabel, statusLabel } from '../utils/format'
import type { SourceMaterial } from '../types'
import clsx from 'clsx'

export default function SourceMaterialViewer({ recordId }: { recordId: string }) {
  const getSourceMaterials = useAppStore((s) => s.getSourceMaterials)
  const materials = getSourceMaterials(recordId)
  const [activeIdx, setActiveIdx] = useState(0)
  const active = materials[activeIdx]

  if (!materials.length) {
    return (
      <div className="card card-body text-center text-sm text-slate-500 py-8">
        无关联材料
      </div>
    )
  }

  const typeIcon = (t: SourceMaterial['type']) => {
    switch (t) {
      case 'code_diff': return FileCode
      case 'pr_description': return FileText
      case 'commit_log': return ScrollText
      case 'ci_log': return ScrollText
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <GitPullRequest size={16} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-900">原始审查材料</h3>
          <span className="text-xs text-slate-500">（{activeIdx + 1}/{materials.length}）</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary text-xs disabled:opacity-40"
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx(activeIdx - 1)}
          >
            <ChevronLeft size={14} /> 上一份
          </button>
          <button
            className="btn btn-secondary text-xs disabled:opacity-40"
            disabled={activeIdx === materials.length - 1}
            onClick={() => setActiveIdx(activeIdx + 1)}
          >
            下一份 <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {(() => {
              const Icon = typeIcon(active.type)
              return <Icon size={14} className="text-slate-500 flex-shrink-0" />
            })()}
            <span className="text-xs text-slate-500 uppercase tracking-wider">{active.type.replace('_', ' ')}</span>
            <span className="text-sm font-medium text-slate-900 truncate">{active.title}</span>
          </div>
          {active.url && (
            <a href={active.url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 flex-shrink-0">
              <ExternalLink size={12} /> 打开 PR
            </a>
          )}
        </div>
      </div>
      <div className="card-body max-h-[380px] overflow-auto">
        {active.type === 'code_diff' ? (
          <pre className="text-xs font-mono text-slate-700 bg-slate-900/95 text-slate-100 p-3 rounded-md overflow-auto whitespace-pre-wrap leading-relaxed">
            {active.content.split('\n').map((line, i) => {
              const isAdd = line.startsWith('+') && !line.startsWith('+++')
              const isDel = line.startsWith('-') && !line.startsWith('---')
              return (
                <div
                  key={i}
                  className={clsx(
                    '-mx-1 px-1',
                    isAdd && 'bg-emerald-900/40 text-emerald-200',
                    isDel && 'bg-rose-900/40 text-rose-200'
                  )}
                >
                  <span className="inline-block w-6 text-right text-slate-500 select-none mr-3 text-[10px]">{i + 1}</span>
                  {line}
                </div>
              )
            })}
          </pre>
        ) : (
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {active.content}
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {materials.map((m, idx) => {
          const Icon = typeIcon(m.type)
          return (
            <button
              key={m.id}
              onClick={() => setActiveIdx(idx)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border flex-shrink-0 transition-colors',
                idx === activeIdx
                  ? 'bg-brand-50 text-brand-700 border-brand-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              <Icon size={12} />
              <span className="truncate max-w-[180px]">{m.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
