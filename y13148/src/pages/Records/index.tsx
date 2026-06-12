import { useState } from 'react'
import {
  Database,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X,
  Check,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useRecordStore } from '@/store/useRecordStore'
import { sourceLabels, statusLabels, statusColors, unitConfigs } from '@/data/unitConfigs'
import { formatDateTime } from '@/utils/format'
import type { RecordSource, RecordStatus, DataRecord } from '@/types'

export default function Records() {
  const { records, addRecord, updateRecord, deleteRecord } = useRecordStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSource, setFilterSource] = useState<RecordSource | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<RecordStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DataRecord | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    unit: 'mm',
    error: '',
    source: 'normal' as RecordSource,
    status: 'pending' as RecordStatus,
    notes: '',
  })

  const allUnits = unitConfigs.flatMap((cat) =>
    cat.units.map((u) => u.symbol)
  )

  const filteredRecords = records.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.notes.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSource = filterSource === 'all' || r.source === filterSource
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchSource && matchStatus
  })

  const handleOpenModal = (record?: DataRecord) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        name: record.name,
        value: record.value.toString(),
        unit: record.unit,
        error: record.error.toString(),
        source: record.source,
        status: record.status,
        notes: record.notes,
      })
    } else {
      setEditingRecord(null)
      setFormData({
        name: '',
        value: '',
        unit: 'mm',
        error: '',
        source: 'normal',
        status: 'pending',
        notes: '',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.value || !formData.error) return

    if (editingRecord) {
      updateRecord(editingRecord.id, {
        name: formData.name,
        value: parseFloat(formData.value),
        unit: formData.unit,
        error: parseFloat(formData.error),
        source: formData.source,
        status: formData.status,
        notes: formData.notes,
      })
    } else {
      addRecord({
        name: formData.name,
        value: parseFloat(formData.value),
        unit: formData.unit,
        error: parseFloat(formData.error),
        source: formData.source,
        status: formData.status,
        notes: formData.notes,
      })
    }
    setShowModal(false)
  }

  const sourceBadgeColor = (source: RecordSource) => {
    const map: Record<RecordSource, 'default' | 'warning' | 'purple'> = {
      normal: 'default',
      draft: 'warning',
      verbal: 'purple',
    }
    return map[source]
  }

  const statusBadgeColor = (status: RecordStatus) => {
    const map: Record<RecordStatus, 'success' | 'info' | 'warning'> = {
      processed: 'success',
      pending: 'info',
      evidence_needed: 'warning',
    }
    return map[status]
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">数据记录管理</h1>
          <p className="text-gray-500 mt-1 text-sm">管理所有数据记录，区分正常记录、计算草稿和口头备注</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          新增记录
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索记录名称或备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部来源</option>
              <option value="normal">正常记录</option>
              <option value="draft">计算草稿</option>
              <option value="verbal">口头备注</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部状态</option>
              <option value="processed">已处理</option>
              <option value="pending">处理中</option>
              <option value="evidence_needed">待补证据</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-zebra">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">名称</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">数值</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">误差</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">来源</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-800">{record.name}</div>
                    {record.notes && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{record.notes}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-700 font-mono">
                    {record.value} {record.unit}
                  </td>
                  <td className="py-4 px-4 text-gray-700 font-mono">
                    ±{record.error} {record.unit}
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={sourceBadgeColor(record.source)}>{sourceLabels[record.source]}</Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={statusBadgeColor(record.status)}>{statusLabels[record.status]}</Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500">
                    {formatDateTime(record.createdAt)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenModal(record)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteRecord(record.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Database size={48} className="mx-auto mb-3 opacity-50" />
              <p>暂无匹配的数据记录</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
          <span>共 {filteredRecords.length} 条记录</span>
          <div className="flex gap-4">
            <span>正常：{records.filter(r => r.source === 'normal').length}</span>
            <span>草稿：{records.filter(r => r.source === 'draft').length}</span>
            <span>口头：{records.filter(r => r.source === 'verbal').length}</span>
          </div>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {editingRecord ? '编辑记录' : '新增记录'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">记录名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入记录名称"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">数值</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">单位</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {allUnits.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">误差值 (±)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.error}
                  onChange={(e) => setFormData({ ...formData, error: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">数据来源</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="normal">正常记录</option>
                    <option value="draft">计算草稿</option>
                    <option value="verbal">口头备注</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">处理状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="pending">处理中</option>
                    <option value="processed">已处理</option>
                    <option value="evidence_needed">待补证据</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="添加备注说明..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} icon={<Check size={16} />}>
                {editingRecord ? '保存修改' : '创建记录'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
