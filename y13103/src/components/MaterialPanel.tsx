import { useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, AlertTriangle, MessageSquare, RotateCcw } from 'lucide-react'
import { useRegressionStore, type MaterialType, type Material, type MaterialImpact } from '@/store/regression'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<MaterialType, { label: string; badge: string; icon: typeof AlertTriangle }> = {
  error_record: { label: '错题记录', badge: 'bg-red-100 text-red-700 border-red-300', icon: AlertTriangle },
  withdrawal: { label: '撤回记录', badge: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: RotateCcw },
  verbal_note: { label: '口头备注', badge: 'bg-blue-100 text-blue-700 border-blue-300', icon: MessageSquare },
}

const MATERIAL_TYPES: MaterialType[] = ['error_record', 'withdrawal', 'verbal_note']

function groupByType(materials: Material[]): Record<MaterialType, Material[]> {
  const grouped: Record<MaterialType, Material[]> = { error_record: [], withdrawal: [], verbal_note: [] }
  for (const m of materials) {
    grouped[m.type].push(m)
  }
  return grouped
}

function getImpactForMaterial(impacts: MaterialImpact[], materialId: string): MaterialImpact | undefined {
  return impacts.find(imp => imp.materialId === materialId)
}

function MaterialCard({ material, impact }: { material: Material; impact?: MaterialImpact }) {
  const { updateMaterial, deleteMaterial } = useRegressionStore()
  const config = TYPE_CONFIG[material.type]
  const Icon = config.icon
  const inactive = material.is_active === 0

  const contentPreview = (() => {
    if (material.type === 'error_record') {
      return (material.content.description as string) || (material.content.error as string) || '无描述'
    }
    if (material.type === 'withdrawal') {
      return (material.content.withdrawn as string) || (material.content.description as string) || '无撤回内容'
    }
    return (material.content.text as string) || (material.content.note as string) || '无备注内容'
  })()

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-opacity',
        inactive ? 'border-gray-200 bg-gray-50 opacity-50' : 'border-gray-200 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', config.badge)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
          {material.type === 'error_record' && material.version > 1 && (
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600 font-medium">
              旧版 v{material.version}
            </span>
          )}
          {material.type === 'error_record' && material.version === 1 && (
            <span className="text-xs text-gray-400">v{material.version}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => updateMaterial(material.id, { isActive: !inactive })}
            className={cn(
              'rounded p-1 transition-colors',
              inactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
            )}
            title={inactive ? '恢复' : '停用'}
          >
            {inactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => deleteMaterial(material.id)}
            className="rounded p-1 text-gray-400 transition-colors hover:text-red-600 hover:bg-red-50"
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className={cn('mt-2 text-sm', inactive ? 'text-gray-400' : 'text-gray-700', 'truncate')}>
        {contentPreview}
      </p>

      {impact && (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
          <p className="text-xs font-medium text-amber-700">影响分析</p>
          <p className="text-xs text-amber-600 mt-0.5">{impact.description}</p>
          {impact.affectedSegments.length > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">
              影响分段: {impact.affectedSegments.join(', ')}
            </p>
          )}
        </div>
      )}

      <p className="mt-1.5 text-xs text-gray-400">
        {new Date(material.created_at).toLocaleString()}
      </p>
    </div>
  )
}

function AddMaterialForm({ onClose }: { onClose: () => void }) {
  const { addMaterial } = useRegressionStore()
  const [type, setType] = useState<MaterialType>('error_record')
  const [content, setContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    const contentObj: Record<string, unknown> = {}
    if (type === 'error_record') {
      contentObj.description = content
    } else if (type === 'withdrawal') {
      contentObj.withdrawn = content
    } else {
      contentObj.text = content
    }
    await addMaterial(type, contentObj)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        {MATERIAL_TYPES.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              type === t
                ? cn(TYPE_CONFIG[t].badge)
                : 'border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100',
            )}
          >
            {TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
          type === 'error_record'
            ? '描述错误内容...'
            : type === 'withdrawal'
              ? '描述撤回内容...'
              : '输入备注内容...'
        }
        className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
        rows={3}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!content.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="inline h-3 w-3 mr-1" />
          添加
        </button>
      </div>
    </form>
  )
}

export default function MaterialPanel() {
  const { materials, materialImpact, currentSession } = useRegressionStore()
  const [showForm, setShowForm] = useState(false)

  if (!currentSession) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm">请先选择一个分段回归会话</p>
        </div>
      </div>
    )
  }

  const grouped = groupByType(materials)
  const hasAny = materials.length > 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">素材管理</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className={cn(
            'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
            showForm
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? '收起' : '添加素材'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {showForm && (
          <AddMaterialForm onClose={() => setShowForm(false)} />
        )}

        {!hasAny && !showForm && (
          <p className="text-center text-sm text-gray-400 py-8">暂无素材记录</p>
        )}

        {MATERIAL_TYPES.map(t => {
          const items = grouped[t]
          if (items.length === 0) return null
          const config = TYPE_CONFIG[t]
          const Icon = config.icon
          return (
            <div key={t}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">{config.label}</span>
                <span className="text-xs text-gray-400">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map(m => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    impact={getImpactForMaterial(materialImpact, m.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
