import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, X, Trash2, AlertTriangle, Compass, Gauge, FileText } from 'lucide-react'
import { useBatchStore, type Material } from '@/stores/batchStore'

const typeLabels: Record<string, string> = {
  angle_of_attack: '迎角记录',
  force_sensor: '力传感器',
  curve_report: '曲线报告',
}

const typeIcons: Record<string, typeof Compass> = {
  angle_of_attack: Compass,
  force_sensor: Gauge,
  curve_report: FileText,
}

export default function MaterialSection() {
  const { id } = useParams<{ id: string }>()
  const { materials, fetchMaterials, addMaterial, removeMaterial } = useBatchStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<{
    type: Material['type']
    name: string
    data: string
  }>({ type: 'angle_of_attack', name: '', data: '{}' })

  useEffect(() => {
    if (id) fetchMaterials(id)
  }, [id, fetchMaterials])

  const handleAdd = async () => {
    if (!id || !form.name) return
    try {
      const parsed = JSON.parse(form.data)
      await addMaterial(id, { type: form.type, name: form.name, data: parsed })
    } catch {
      await addMaterial(id, { type: form.type, name: form.name, data: { raw: form.data } })
    }
    setShowModal(false)
    setForm({ type: 'angle_of_attack', name: '', data: '{}' })
  }

  const columns: Material['type'][] = ['angle_of_attack', 'force_sensor', 'curve_report']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">材料归集</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => {
          const Icon = typeIcons[col]
          const items = materials.filter((m) => m.type === col)
          return (
            <div key={col} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Icon size={16} className="text-amber-500" />
                  {typeLabels[col]}
                </div>
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, type: col }))
                    setShowModal(true)
                  }}
                  className="text-slate-400 hover:text-amber-500 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-slate-900/50 rounded-md px-3 py-2 text-sm"
                  >
                    <Icon size={14} className="text-slate-500" />
                    <span className="text-slate-300 flex-1 truncate">{item.name}</span>
                    {item.anomalyFlag && (
                      <AlertTriangle size={14} className="text-red-500" />
                    )}
                    <button
                      onClick={() => removeMaterial(item.id)}
                      className="text-slate-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-3">暂无材料</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-100">添加材料</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">类型</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Material['type'] }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="angle_of_attack">迎角记录</option>
                  <option value="force_sensor">力传感器</option>
                  <option value="curve_report">曲线报告</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="材料名称"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">数据 (JSON)</label>
                <textarea
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  rows={5}
                  className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-md text-sm text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-md text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-900 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
