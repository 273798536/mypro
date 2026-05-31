import { useState, useEffect, useCallback } from 'react'
import { getVerifyList, getVerifyStats, updateVerifyStatus, updateVerifyIssues, batchUpdateStatus } from '@/api'
import StatCard from '@/components/StatCard'
import DataTable from '@/components/DataTable'
import type { Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import IssueBadge from '@/components/IssueBadge'
import type { VerificationRecord, VerifyStats, VerifyStatus, IssueType, IssueMark } from '@/types'
import { cn } from '@/lib/utils'
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Filter, ArrowRight, X, Plus, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const PIE_COLORS = ['#f97316', '#ef4444', '#8b5cf6']

const statusOptions: { value: VerifyStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待核验' },
  { value: 'verifying', label: '核验中' },
  { value: 'toReview', label: '待复核' },
  { value: 'passed', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
]

const issueOptions: { value: IssueType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'breakpoint', label: '轨迹断点' },
  { value: 'duplicate', label: '面积重复' },
  { value: 'missing_signature', label: '签字缺失' },
  { value: 'area_mismatch', label: '面积不一致' },
]

const nextStatusMap: Partial<Record<VerifyStatus, VerifyStatus>> = {
  pending: 'verifying',
  verifying: 'toReview',
  toReview: 'passed',
}

export default function VerifyPage() {
  const [stats, setStats] = useState<VerifyStats | null>(null)
  const [records, setRecords] = useState<VerificationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<VerifyStatus | ''>('')
  const [issueFilter, setIssueFilter] = useState<IssueType | ''>('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [issueModal, setIssueModal] = useState<{ id: string; issues: IssueMark[] } | null>(null)
  const [newIssue, setNewIssue] = useState<{ type: IssueType; description: string; severity: 'low' | 'medium' | 'high' }>({
    type: 'breakpoint',
    description: '',
    severity: 'medium',
  })

  const fetchStats = useCallback(async () => {
    try {
      const data = await getVerifyStats()
      setStats(data)
    } catch { /* ignore */ }
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getVerifyList({
        page,
        pageSize: 10,
        status: statusFilter || undefined,
        issueType: issueFilter || undefined,
      })
      setRecords(data.data)
      setTotal(data.total)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, issueFilter])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [statusFilter, issueFilter])

  async function handleStatusUpdate(id: string, status: VerifyStatus) {
    await updateVerifyStatus(id, status)
    await fetchList()
    await fetchStats()
  }

  async function handleBatchUpdate(status: VerifyStatus) {
    if (selectedKeys.length === 0) return
    await batchUpdateStatus(selectedKeys, status)
    setSelectedKeys([])
    await fetchList()
    await fetchStats()
  }

  async function handleSaveIssues() {
    if (!issueModal) return
    const issues = issueModal.issues.map(({ type, description, severity, markedBy }) => ({
      type, description, severity, markedBy, recordId: issueModal.id,
    }))
    await updateVerifyIssues(issueModal.id, issues)
    setIssueModal(null)
    await fetchList()
    await fetchStats()
  }

  const pieData = stats ? [
    { name: '轨迹断点', value: stats.issueDistribution.breakpoint },
    { name: '面积重复', value: stats.issueDistribution.duplicate },
    { name: '签字缺失', value: stats.issueDistribution.missing_signature },
  ].filter(d => d.value > 0) : []

  function openIssueModal(record: VerificationRecord) {
    setIssueModal({ id: record.id, issues: record.issues?.length ? [...record.issues] : [] })
    setNewIssue({ type: 'breakpoint', description: '', severity: 'medium' })
  }

  const columns: Column<VerificationRecord>[] = [
    { key: 'farmerName', title: '农户姓名', width: 90 },
    { key: 'plotNo', title: '地块编号', width: 100 },
    {
      key: 'declaredArea', title: '申报面积(亩)', width: 110, sortable: true,
      render: (_v, r) => <span className="font-mono">{r.declaredArea.toFixed(2)}</span>,
    },
    {
      key: 'trackArea', title: '轨迹面积(亩)', width: 110, sortable: true,
      render: (_v, r) => <span className="font-mono">{r.trackArea.toFixed(2)}</span>,
    },
    {
      key: 'verifiedArea', title: '核验面积(亩)', width: 110, sortable: true,
      render: (_v, r) => <span className="font-mono font-medium">{r.verifiedArea.toFixed(2)}</span>,
    },
    {
      key: 'issues', title: '问题标记', width: 160,
      render: (_v, r) => (
        <div className="flex flex-wrap gap-1">
          {r.issues?.length > 0 ? r.issues.map((iss) => (
            <IssueBadge key={iss.id} type={iss.type} />
          )) : <span className="text-xs text-gray-300">-</span>}
        </div>
      ),
    },
    {
      key: 'status', title: '状态', width: 90,
      render: (_v, r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', title: '操作', width: 150,
      render: (_v, r) => (
        <div className="flex items-center gap-1">
          {nextStatusMap[r.status] && (
            <button
              onClick={() => handleStatusUpdate(r.id, nextStatusMap[r.status]!)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary-50 rounded transition-colors"
            >
              推进 <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => openIssueModal(r)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
          >
            <Plus className="w-3 h-3" /> 问题
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-serif font-semibold text-primary">面积核验</h2>
        <p className="text-sm text-gray-500 mt-1">核验作业面积与轨迹数据，标记问题并推进状态</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="总记录" value={stats?.total ?? 0} icon={BarChart3} color="primary" />
          <StatCard title="已通过" value={stats?.passed ?? 0} icon={CheckCircle2} color="success" />
          <StatCard title="待处理" value={stats?.pending ?? 0} icon={Clock} color="warning" />
          <StatCard title="有问题" value={stats?.issues ?? 0} icon={AlertTriangle} color="danger" />
        </div>
        <div className="card p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">问题类型分布</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25} strokeWidth={1} stroke="#fff">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} 条`, '']} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[140px] text-xs text-gray-300">暂无问题数据</div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as VerifyStatus | '')} className="select-field w-32">
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value as IssueType | '')} className="select-field w-32">
            {issueOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {selectedKeys.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">已选 {selectedKeys.length} 条</span>
              <button onClick={() => handleBatchUpdate('verifying')} className="btn-primary text-xs px-3 py-1.5">
                批量推进
              </button>
            </div>
          )}
        </div>
      </div>

      <DataTable<VerificationRecord>
        columns={columns}
        data={records}
        total={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        rowKey="id"
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        loading={loading}
      />

      {issueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIssueModal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h3 className="font-serif font-semibold text-primary">问题标记</h3>
              <button onClick={() => setIssueModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {issueModal.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <IssueBadge type={issue.type} />
                  <span className="flex-1 text-sm text-gray-600">{issue.description}</span>
                  <button onClick={() => {
                    const updated = issueModal.issues.filter((_, i) => i !== idx)
                    setIssueModal({ ...issueModal, issues: updated })
                  }} className="text-gray-400 hover:text-danger transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="border border-dashed border-surface-border rounded-lg p-3 space-y-3">
                <div className="flex gap-2">
                  <select value={newIssue.type} onChange={(e) => setNewIssue({ ...newIssue, type: e.target.value as IssueType })} className="select-field w-28">
                    <option value="breakpoint">轨迹断点</option>
                    <option value="duplicate">面积重复</option>
                    <option value="missing_signature">签字缺失</option>
                    <option value="area_mismatch">面积不一致</option>
                  </select>
                  <select value={newIssue.severity} onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value as 'low' | 'medium' | 'high' })} className="select-field w-24">
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
                <input
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  placeholder="问题描述"
                  className="input-field"
                />
                <button
                  onClick={() => {
                    if (!newIssue.description.trim()) return
                    setIssueModal({
                      ...issueModal,
                      issues: [...issueModal.issues, { ...newIssue, id: `new-${Date.now()}`, recordId: issueModal.id, markedBy: '操作员', createdAt: new Date().toISOString() }],
                    })
                    setNewIssue({ type: 'breakpoint', description: '', severity: 'medium' })
                  }}
                  className="btn-secondary text-xs px-3 py-1.5"
                  disabled={!newIssue.description.trim()}
                >
                  添加问题
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-border">
              <button onClick={() => setIssueModal(null)} className="btn-secondary text-sm px-4 py-2">取消</button>
              <button onClick={handleSaveIssues} className="btn-primary text-sm px-4 py-2">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
