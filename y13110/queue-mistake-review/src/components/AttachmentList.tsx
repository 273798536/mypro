import type { Attachment } from '../types'

interface AttachmentListProps {
  attachments: Attachment[]
  lateAttachmentImpact?: string
}

const typeIcon: Record<string, string> = {
  pdf: '📄',
  image: '🖼️',
  doc: '📝',
  excel: '📊',
}

export default function AttachmentList({ attachments, lateAttachmentImpact }: AttachmentListProps) {
  const normalAttachments = attachments.filter(a => !a.isLateArrival)
  const lateAttachments = attachments.filter(a => a.isLateArrival)

  if (attachments.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📎</span>
          <h4 className="font-semibold text-gray-800">附件列表</h4>
        </div>
        <p className="text-sm text-gray-500">暂无附件</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📎</span>
        <h4 className="font-semibold text-gray-800">附件列表</h4>
        <span className="ml-auto text-xs text-gray-500">
          共 {attachments.length} 个
          {lateAttachments.length > 0 && (
            <span className="text-purple-600 ml-1">
              (含{lateAttachments.length}个晚到)
            </span>
          )}
        </span>
      </div>

      {normalAttachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {normalAttachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="text-xl">{typeIcon[att.type] || '📁'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{att.name}</p>
                <p className="text-xs text-gray-400">{att.uploadTime}</p>
              </div>
              {att.size && (
                <span className="text-xs text-gray-400">{att.size}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {lateAttachments.length > 0 && (
        <div className="border-t border-purple-200 pt-3">
          <p className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
            <span>⏰</span> 晚到附件（可能影响结论）
          </p>
          <div className="space-y-2">
            {lateAttachments.map(att => (
              <div
                key={att.id}
                className="p-3 bg-purple-50 rounded-md border border-purple-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{typeIcon[att.type] || '📁'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-700 truncate">{att.name}</p>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                        晚到
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">上传时间: {att.uploadTime}</p>
                  </div>
                </div>
                {att.impactDescription && (
                  <div className="mt-2 pt-2 border-t border-purple-200/50">
                    <p className="text-xs text-purple-700">
                      <span className="font-medium">影响说明：</span>
                      {att.impactDescription}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {lateAttachmentImpact && (
            <div className="mt-3 p-2 bg-white rounded border-l-3 border-purple-400">
              <p className="text-xs text-gray-600">
                <span className="font-medium text-purple-700">总体影响：</span>
                {lateAttachmentImpact}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
