import type { FieldMapping, DataSource } from '../types'
import { DataSourceLabel } from '../types'

interface SourceInfoPanelProps {
  dataSource: DataSource
  fieldMappingNotes?: FieldMapping[]
  submittedBy?: string
  createdAt: string
  updatedAt: string
}

export default function SourceInfoPanel({
  dataSource,
  fieldMappingNotes,
  submittedBy,
  createdAt,
  updatedAt
}: SourceInfoPanelProps) {
  const hasFieldMapping = fieldMappingNotes && fieldMappingNotes.length > 0

  const sourceColor: Record<DataSource, string> = {
    manual: 'bg-green-100 text-green-700',
    import_old: 'bg-orange-100 text-orange-700',
    import_new: 'bg-blue-100 text-blue-700',
    api_sync: 'bg-purple-100 text-purple-700'
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📥</span>
        <h4 className="font-semibold text-gray-800">来源与处理记录</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-xs text-gray-500">数据来源</span>
          <div className="mt-0.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sourceColor[dataSource]}`}>
              {DataSourceLabel[dataSource]}
            </span>
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-500">提交人</span>
          <p className="mt-0.5 text-gray-700">{submittedBy || '-'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">创建时间</span>
          <p className="mt-0.5 text-gray-700 text-xs">{createdAt}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">更新时间</span>
          <p className="mt-0.5 text-gray-700 text-xs">{updatedAt}</p>
        </div>
      </div>

      {hasFieldMapping && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
            <span>🔄</span> 字段映射记录
            <span className="text-gray-400 font-normal">（历史数据字段名不一致，已自动映射）</span>
          </p>
          <div className="space-y-1.5">
            {fieldMappingNotes!.map((mapping, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5"
              >
                <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                  {mapping.oldFieldName}
                </span>
                <span className="text-gray-400">→</span>
                <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                  {mapping.newFieldName}
                </span>
                <span className="ml-auto text-gray-400 text-[10px]">
                  {mapping.mapper} · {mapping.mappedAt.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            💡 提示：历史数据字段名可能前后不一，系统已自动映射并保留来源记录。
          </p>
        </div>
      )}
    </div>
  )
}
