import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { fetchRecords } from '@/utils/api'
import StatusBadge from '@/components/StatusBadge'
import AnomalyBadge from '@/components/AnomalyBadge'
import LevelIndicator from '@/components/LevelIndicator'
import type { MuseumRecord, ViewMode } from '@/types'

const viewModes: { key: ViewMode; label: string }[] = [
  { key: 'anomaly_first', label: '异常优先' },
  { key: 'chronological', label: '时间顺序' },
  { key: 'by_cabinet', label: '按展柜分组' },
]

const floors = ['1层', '2层', '3层', '3层/B区']
const anomalyTypes = [
  { value: 'normal', label: '正常' },
  { value: 'flicker', label: '灯光闪烁' },
  { value: 'brightness_abnormal', label: '亮度异常' },
  { value: 'off_schedule', label: '非计划时段' },
]
const statuses = [
  { value: 'pending', label: '待审核' },
  { value: 'reviewed', label: '已审核' },
  { value: 'rejudged', label: '已重审' },
  { value: 'resolved', label: '已解决' },
]

export default function RecordList() {
  const navigate = useNavigate()
  const { filters, setFilters, currentView, setCurrentView, records, setRecords } = useStore()
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const params: Record<string, string | number> = {
      page,
      pageSize: 12,
    }
    if (filters.floor) params.floor = filters.floor
    if (filters.anomalyType) params.anomalyType = filters.anomalyType
    if (filters.status) params.status = filters.status
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    if (currentView === 'anomaly_first') {
      params.view = 'anomaly'
    } else if (currentView === 'chronological') {
      params.view = 'chronological'
    }

    fetchRecords(params).then((res) => {
      let data = res.records
      if (currentView === 'by_cabinet') {
        data = [...data].sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo))
      }
      setRecords(data)
      setTotalPages(res.pagination.totalPages)
    }).catch(() => {
      setRecords([])
    })
  }, [page, filters, currentView, setRecords])

  const displayedRecords = currentView === 'by_cabinet'
    ? [...records].sort((a, b) => a.cabinetNo.localeCompare(b.cabinetNo))
    : records

  const groupedRecords = currentView === 'by_cabinet'
    ? displayedRecords.reduce<Record<string, MuseumRecord[]>>((acc, r) => {
        const key = r.cabinetNo
        acc[key] = acc[key] || []
        acc[key].push(r)
        return acc
      }, {})
    : null

  return (
    <div className="p-6">
      <div className="bg-museum-surface rounded-xl border border-museum-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-museum-amber" />
          <span className="text-sm font-medium text-museum-text">筛选条件</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select
            value={filters.floor}
            onChange={(e) => { setFilters({ floor: e.target.value }); setPage(1) }}
            className="bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
          >
            <option value="">全部楼层</option>
            {floors.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          <select
            value={filters.anomalyType}
            onChange={(e) => { setFilters({ anomalyType: e.target.value }); setPage(1) }}
            className="bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
          >
            <option value="">全部异常类型</option>
            {anomalyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select
            value={filters.status}
            onChange={(e) => { setFilters({ status: e.target.value }); setPage(1) }}
            className="bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
          >
            <option value="">全部状态</option>
            {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => { setFilters({ startDate: e.target.value }); setPage(1) }}
            className="bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => { setFilters({ endDate: e.target.value }); setPage(1) }}
            className="bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
          />
        </div>

        <div className="flex gap-2 mt-3">
          {viewModes.map((vm) => (
            <button
              key={vm.key}
              onClick={() => setCurrentView(vm.key)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                currentView === vm.key
                  ? 'bg-museum-amber text-museum-bg font-medium'
                  : 'bg-museum-card text-museum-textMuted hover:text-museum-text'
              }`}
            >
              {vm.label}
            </button>
          ))}
        </div>
      </div>

      {currentView === 'by_cabinet' && groupedRecords ? (
        Object.entries(groupedRecords).map(([cabinetNo, recs]) => (
          <div key={cabinetNo} className="mb-6">
            <h3 className="text-sm font-medium text-museum-amber mb-3">展柜 {cabinetNo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recs.map((record) => (
                <RecordCard key={record.id} record={record} onClick={() => navigate(`/records/${record.id}`)} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedRecords.map((record) => (
            <RecordCard key={record.id} record={record} onClick={() => navigate(`/records/${record.id}`)} />
          ))}
        </div>
      )}

      {displayedRecords.length === 0 && (
        <div className="text-center py-20 text-museum-textDim">暂无记录</div>
      )}

      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-2 rounded-lg bg-museum-card border border-museum-border text-museum-textMuted hover:text-museum-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm text-museum-textMuted">
          {page} / {totalPages || 1}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-lg bg-museum-card border border-museum-border text-museum-textMuted hover:text-museum-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function RecordCard({ record, onClick }: { record: MuseumRecord; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-museum-card rounded-xl border p-4 cursor-pointer transition-all hover:border-museum-amber/50 hover:shadow-lg ${
        record.hasDirtyData ? 'border-museum-purple' : 'border-museum-border'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-museum-text">{record.cabinetNo}</h3>
          <p className="text-xs text-museum-textDim mt-0.5">{record.floor} · {record.unit}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <AnomalyBadge anomalyType={record.anomalyType} />
        <LevelIndicator level={record.anomalyLevel} />
      </div>

      {record.hasDirtyData && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-museum-purpleBg text-museum-purple mb-3">
          含异常数据
        </span>
      )}

      <img
        src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`museum display cabinet ${record.cabinetNo}, dim dramatic lighting, glass case with artifact, professional photography`)}&image_size=square`}
        alt={record.cabinetNo}
        className="w-full h-32 object-cover rounded-lg bg-museum-surface"
      />

      <p className="text-xs text-museum-textDim mt-2">
        {new Date(record.createdAt).toLocaleString('zh-CN')}
      </p>
    </div>
  )
}
