import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecordStore } from '@/store/useRecordStore'
import Toolbar, { type SeverityLevel } from '@/components/common/Toolbar'
import StatsSummary from '@/components/records/StatsSummary'
import FilterTabs, { type FilterType } from '@/components/records/FilterTabs'
import RecordCard from '@/components/records/RecordCard'
import type { NormalRecord, RecordStatus, Severity } from '@/types'

function RecordListPage() {
  const navigate = useNavigate()
  const { records, fetchRecords, loading, setFilter } = useRecordStore()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [timeRange, setTimeRange] = useState('all')
  const [device, setDevice] = useState('all')
  const [severity, setSeverity] = useState<SeverityLevel>('all')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const filterCounts = useMemo<Record<FilterType, number>>(() => {
    return {
      all: records.length,
      failed: records.filter((r) => r.status === 'failed').length,
      review: records.filter((r) => r.status === 'review').length,
      passed: records.filter((r) => r.status === 'passed').length,
      pending: records.filter((r) => r.status === 'pending').length,
    }
  }, [records])

  const filteredRecords = useMemo(() => {
    return records.filter((record: NormalRecord) => {
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase()
        const matchId = record.id.toLowerCase().includes(keyword)
        const matchDevice = record.deviceId.toLowerCase().includes(keyword)
        if (!matchId && !matchDevice) return false
      }

      if (device !== 'all' && record.deviceId !== device) {
        return false
      }

      if (currentFilter !== 'all') {
        if (record.status !== currentFilter) {
          return false
        }
      }

      if (severity !== 'all') {
        const recordSeverity = record.occlusion?.severity
        if (!recordSeverity || recordSeverity !== (severity as Severity)) {
          return false
        }
      }

      return true
    })
  }, [records, searchKeyword, device, currentFilter, severity])

  const handleRefresh = () => {
    fetchRecords()
  }

  const handleExport = () => {
    console.log('导出报告')
  }

  const handleCardClick = (id: string) => {
    navigate(`/records/${id}`)
  }

  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter)
    setFilter({ status: filter as RecordStatus | 'all' })
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        title="记录列表"
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        device={device}
        onDeviceChange={setDevice}
        severity={severity}
        onSeverityChange={setSeverity}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <StatsSummary records={records} />

        <FilterTabs
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
          counts={filterCounts}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-text-secondary">加载中...</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-text-secondary text-lg mb-2">暂无记录</div>
              <div className="text-text-muted text-sm">尝试调整筛选条件</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => handleCardClick(record.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecordListPage
