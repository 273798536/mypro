import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react'
import { useAppStore } from '@/store'
import type { CultureRecord } from '@/store'

const GROUPS = ['对照组', '低剂量组', '中剂量组', '高剂量组']
const LOCATIONS = ['LOC-A', 'LOC-B', 'LOC-C', 'LOC-D']
const STATUSES = ['normal', 'pending_review', 'anomaly']

const STATUS_DISPLAY = {
  normal: { label: '正常', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  pending_review: { label: '待复核', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
  anomaly: { label: '异常', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
}

interface FormState {
  animal_id: string
  experiment_group: string
  sampling_location: string
  reagent_batch: string
  expected_batch: string
  culture_date: string
}

const emptyForm: FormState = {
  animal_id: '',
  experiment_group: GROUPS[0],
  sampling_location: LOCATIONS[0],
  reagent_batch: '',
  expected_batch: '',
  culture_date: '',
}

export default function Records() {
  const { records, fetchRecords, createRecord, validateRecords, loading } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const loadRecords = useCallback(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (filterGroup) params.group = filterGroup
    if (filterStatus) params.status = filterStatus
    if (filterLocation) params.location = filterLocation
    fetchRecords(params)
  }, [search, filterGroup, filterStatus, filterLocation, fetchRecords])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleSubmit = async () => {
    if (!form.animal_id || !form.reagent_batch || !form.expected_batch || !form.culture_date) return
    await createRecord(form as Partial<CultureRecord>)
    setShowForm(false)
    setForm(emptyForm)
    loadRecords()
  }

  const handleBatchValidate = async () => {
    if (selected.size === 0) return
    await validateRecords(Array.from(selected))
    setSelected(new Set())
    loadRecords()
  }

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const batchMismatch = form.reagent_batch && form.expected_batch && form.reagent_batch !== form.expected_batch

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-title text-2xl font-semibold text-slate-800">培养记录</h2>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBatchValidate}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              批量校验 ({selected.size})
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Plus size={16} />
            新增记录
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索动物ID、试剂批次..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
          />
        </div>
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          <option value="">全部实验组</option>
          {GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          <option value="">全部状态</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_DISPLAY[s as keyof typeof STATUS_DISPLAY].label}</option>
          ))}
        </select>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          <option value="">全部采样地点</option>
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-800">新增培养记录</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">动物ID *</label>
              <input
                value={form.animal_id}
                onChange={(e) => setForm({ ...form, animal_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                placeholder="ANM-001"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">实验组 *</label>
              <select
                value={form.experiment_group}
                onChange={(e) => setForm({ ...form, experiment_group: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">采样地点</label>
              <select
                value={form.sampling_location}
                onChange={(e) => setForm({ ...form, sampling_location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">试剂批次 *</label>
              <input
                value={form.reagent_batch}
                onChange={(e) => setForm({ ...form, reagent_batch: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${
                  batchMismatch ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                placeholder="RB-2024-001"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">预期批次 *</label>
              <input
                value={form.expected_batch}
                onChange={(e) => setForm({ ...form, expected_batch: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${
                  batchMismatch ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                placeholder="RB-2024-001"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">培养日期 *</label>
              <input
                type="date"
                value={form.culture_date}
                onChange={(e) => setForm({ ...form, culture_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>
          </div>
          {batchMismatch && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              ⚠ 试剂批次与预期批次不一致，提交后将自动标记为异常并建议修改口径
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm) }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              提交
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === records.length && records.length > 0}
                  onChange={() => {
                    if (selected.size === records.length) setSelected(new Set())
                    else setSelected(new Set(records.map((r) => r.id)))
                  }}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">动物ID</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">实验组</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">采样地点</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">试剂批次</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">预期批次</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">培养日期</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">状态</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => {
              const st = STATUS_DISPLAY[r.status as keyof typeof STATUS_DISPLAY]
              const Icon = st.icon
              return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.animal_id}</td>
                  <td className="px-4 py-3 text-slate-600">{r.experiment_group}</td>
                  <td className="px-4 py-3 text-slate-600">{r.sampling_location || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.reagent_batch}</td>
                  <td className="px-4 py-3 text-slate-600">{r.expected_batch}</td>
                  <td className="px-4 py-3 text-slate-600">{r.culture_date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      <Icon size={12} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-amber-600 hover:text-amber-700 text-xs font-medium">
                      详情
                    </button>
                  </td>
                </tr>
              )
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
