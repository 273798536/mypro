import { AlertTriangle, ArrowRight, FileWarning } from 'lucide-react'
import type { EquipmentRecord } from '@/types'

interface LateAttachmentPanelProps {
  record: EquipmentRecord
}

export default function LateAttachmentPanel({ record }: LateAttachmentPanelProps) {
  const lateAttachments = record.attachments.filter((a) => a.isLateArrival)

  if (lateAttachments.length === 0) return null

  return (
    <div className="card-base p-4 space-y-4">
      {lateAttachments.map((attachment) => (
        <div key={attachment.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-status-late" />
            <span className="text-sm font-medium text-base-300">{attachment.name}</span>
            <span className="tag-late">{attachment.type}</span>
          </div>

          {attachment.impactDescription && (
            <div>
              <h4 className="section-title flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warn-orange" />
                影响说明
              </h4>
              <p className="text-sm text-base-400 leading-relaxed pl-5">
                {attachment.impactDescription}
              </p>
            </div>
          )}

          {attachment.originalConclusion && attachment.revisedConclusion && (
            <div>
              <h4 className="section-title">结论对比</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded border border-warn-orange/30 bg-base-900 p-3">
                  <span className="text-xs text-base-500 block mb-1">原始结论</span>
                  <span className="text-sm text-warn-orange-light">{attachment.originalConclusion}</span>
                </div>
                <ArrowRight className="w-6 h-6 text-base-500 shrink-0" />
                <div className="flex-1 rounded border border-industrial-blue/30 bg-base-900 p-3">
                  <span className="text-xs text-base-500 block mb-1">补录后结论</span>
                  <span className="text-sm text-industrial-blue-light">{attachment.revisedConclusion}</span>
                </div>
              </div>
            </div>
          )}

          {attachment.paramChanges && attachment.paramChanges.length > 0 && (
            <div>
              <h4 className="section-title">参数变化对照</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-600">
                    <th className="text-left text-xs text-base-500 font-medium py-1.5">参数名</th>
                    <th className="text-left text-xs text-base-500 font-medium py-1.5">变更前</th>
                    <th className="w-8" />
                    <th className="text-left text-xs text-base-500 font-medium py-1.5">变更后</th>
                  </tr>
                </thead>
                <tbody>
                  {attachment.paramChanges.map((change, idx) => (
                    <tr key={idx} className="border-b border-base-600/50">
                      <td className="py-1.5 text-base-300 font-mono text-xs">{change.paramName}</td>
                      <td className="py-1.5 text-warn-orange/70 font-mono text-xs">{change.beforeValue}</td>
                      <td className="py-1.5 text-center">
                        <ArrowRight className="w-3.5 h-3.5 text-base-500 inline" />
                      </td>
                      <td className="py-1.5 text-industrial-blue-light font-mono text-xs">{change.afterValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
