import { useParams, useNavigate } from 'react-router-dom'
import { useSeismicStore } from '@/store/useSeismicStore'
import TraceLinkDiagram from '@/components/TraceLinkDiagram'
import ConflictDetailCard from '@/components/ConflictDetailCard'
import ExportPanel from '@/components/ExportPanel'
import { ArrowLeft, Fingerprint } from 'lucide-react'
import type { TraceLink } from '@/types'

export default function TraceDetail() {
  const { resultId } = useParams<{ resultId: string }>()
  const navigate = useNavigate()
  const traceLinks = useSeismicStore((s) => s.traceLinks)
  const alignmentResult = useSeismicStore((s) => s.alignmentResult)

  const link: TraceLink | undefined = traceLinks.find(
    (l) => l.resultId === resultId
  )

  if (!link || !alignmentResult) {
    return (
      <div className="min-h-screen bg-[#0F1923] flex items-center justify-center">
        <div className="text-center">
          <Fingerprint className="w-12 h-12 text-steel-600 mx-auto mb-4" />
          <p className="text-steel-500 text-lg">未找到溯源记录</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-steel-800 hover:bg-steel-700 text-slate-200 rounded text-sm transition-colors"
          >
            返回工作台
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1923] flex flex-col">
      <header className="h-14 bg-steel-900 border-b border-steel-700 flex items-center px-6 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-300 hover:text-signal transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回工作台</span>
        </button>
        <div className="ml-6 flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-signal" />
          <span className="text-sm font-mono text-slate-300">
            溯源明细：{resultId}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              溯源链路
            </h2>
            <TraceLinkDiagram traceLink={link} />
          </section>

          {link.conflicts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                关联冲突 ({link.conflicts.length})
              </h2>
              <div className="space-y-3">
                {link.conflicts.map((conflict) => (
                  <ConflictDetailCard key={conflict.id} conflict={conflict} />
                ))}
              </div>
            </section>
          )}

          {link.damageAssociation.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                关联损伤照片 ({link.damageAssociation.length})
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {link.damageAssociation.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-steel-800 border border-steel-700 rounded overflow-hidden"
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.stage}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs text-slate-300">{photo.stage}</p>
                      {photo.timestamp && (
                        <p className="text-xs font-mono text-steel-500">
                          {new Date(photo.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              导出报告
            </h2>
            <ExportPanel />
          </section>
        </div>
      </main>
    </div>
  )
}
