import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, Download, AlertTriangle, FileSpreadsheet, Filter, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card } from '@/components/Card'
import { StatusBadge, AnomalyBadgeList } from '@/components/StatusBadge'
import { RegistrationStatus, AnomalyType } from '@/types'
import { formatDateTime, getExamLevelText, maskIdNumber, maskPhone } from '@/utils/format'
import { cn } from '@/lib/utils'

export default function RegistrationList() {
  const { registrations, filters, loadRegistrations, setFilters, exportToExcel, exportAnomalyReport, loading } = useAppStore()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    loadRegistrations()
  }, [filters])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({ keyword: searchKeyword || undefined })
  }

  const handleStatusFilter = (status: RegistrationStatus | undefined) => {
    setFilters({ status })
  }

  const handleAnomalyFilter = (anomalyType: AnomalyType | undefined) => {
    setFilters({ anomalyType })
  }

  const handleLevelFilter = (level: string | undefined) => {
    setFilters({ examLevel: level })
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === registrations.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(registrations.map((r) => r.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const anomalyCounts = registrations.reduce(
    (acc, r) => {
      r.anomalies.forEach((a) => {
        acc[a] = (acc[a] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      {/* 异常提示栏 */}
      {Object.keys(anomalyCounts).length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-800">异常提醒</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(anomalyCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => handleAnomalyFilter(type as AnomalyType)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  filters.anomalyType === type
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-100'
                )}
              >
                {type === 'repertoire_mismatch' && '曲目不符'}
                {type === 'payment_late' && '缴费晚到'}
                {type === 'document_missing' && '证件缺失'}
                {type === 'teacher_contradiction' && '老师补充说明'}
                {type === 'material_incomplete' && '材料不完整'}
                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                  {count}
                </span>
              </button>
            ))}
            {filters.anomalyType && (
              <button
                onClick={() => handleAnomalyFilter(undefined)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      {/* 筛选区 */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索学生姓名、身份证号、电话、指导老师..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filters.status || ''}
              onChange={(e) => handleStatusFilter(e.target.value as RegistrationStatus || undefined)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部状态</option>
              <option value="pending">待审核</option>
              <option value="reviewing">审核中</option>
              <option value="repertoire_mismatch">曲目不符</option>
              <option value="payment_late">缴费晚到</option>
              <option value="document_missing">证件缺失</option>
              <option value="passed">审核通过</option>
              <option value="rejected">审核驳回</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filters.examLevel || ''}
              onChange={(e) => handleLevelFilter(e.target.value || undefined)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部级别</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => (
                <option key={l} value={String(l)}>
                  {l}级
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => exportToExcel(selectedIds.length > 0 ? selectedIds : undefined)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出Excel
          </button>

          <button
            onClick={exportAnomalyReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-orange text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            异常报告
          </button>
        </div>
      </Card>

      {/* 批量操作栏 */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-primary-800 font-medium">
            已选择 {selectedIds.length} 条记录
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => exportToExcel(selectedIds)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              批量导出
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === registrations.length && registrations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">学生信息</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">级别</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">指导老师</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">报名状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">异常标记</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">提交时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">版本</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    暂无报名数据
                  </td>
                </tr>
              ) : (
                registrations.map((registration, index) => (
                  <tr
                    key={registration.id}
                    className={cn(
                      'hover:bg-slate-50 transition-colors',
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-25',
                      registration.anomalies.length > 0 && 'bg-orange-50/50'
                    )}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(registration.id)}
                        onChange={() => toggleSelect(registration.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {registration.studentName}
                        </div>
                        <div className="text-sm text-slate-500">
                          {maskIdNumber(registration.idNumber)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {maskPhone(registration.phone)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-700">
                        {getExamLevelText(registration.examLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-700">{registration.guideTeacher}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={registration.status} />
                    </td>
                    <td className="px-4 py-4">
                      <AnomalyBadgeList anomalies={registration.anomalies} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDateTime(registration.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-500 font-mono">
                        v{registration.version}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/registration/${registration.id}`}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/registration/${registration.id}/history`}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="查看历史"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
