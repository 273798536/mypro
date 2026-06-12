import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Navigation,
  AlertTriangle,
  User,
  Upload,
  Calculator,
  Download,
  ArrowRight,
  FileSpreadsheet,
  PieChart as PieChartIcon,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import EventDrawer from '@/components/EventDrawer'
import {
  useDashboardStats,
  useAnomaliesByRowId,
  useComputeByRowId,
  useRows,
  useActions,
} from '@/hooks/useAppStore'
import type { SensorRow, AnomalyQueue } from '@/types'
import { useMemo, useState } from 'react'

const RESULT_COLORS: Record<string, string> = {
  normal: '#059669',
  warning: '#D97706',
  critical: '#DC2626',
}

const Dashboard = () => {
  const navigate = useNavigate()
  const stats = useDashboardStats()
  const rows = useRows()
  const { setSelectedRowId } = useActions()
  const [drawerRowId, setDrawerRowId] = useState<string | null>(null)

  const pieData = useMemo(() => {
    return [
      { name: '正常', value: stats.resultDistribution.normal, key: 'normal' },
      { name: '预警', value: stats.resultDistribution.warning, key: 'warning' },
      { name: '临界', value: stats.resultDistribution.critical, key: 'critical' },
    ].filter((d) => d.value > 0)
  }, [stats.resultDistribution])

  const totalComputes = stats.resultDistribution.normal + stats.resultDistribution.warning + stats.resultDistribution.critical

  const targetRow = useMemo(() => {
    if (!drawerRowId) return undefined
    return rows.find((r) => r.id === drawerRowId) as SensorRow | undefined
  }, [drawerRowId, rows])

  const targetCompute = drawerRowId ? useComputeByRowId(drawerRowId) : undefined
  const targetAnomalies = drawerRowId ? useAnomaliesByRowId(drawerRowId) : []

  const openAnomaly = (a: AnomalyQueue) => {
    setSelectedRowId(a.rowId)
    navigate('/handover')
    setDrawerRowId(a.rowId)
  }

  return (
    <div>
      <div className="grid grid-cols-4 mb-6">
        <StatCard
          accent="primary"
          label="总记录数"
          value={stats.totalRows}
          sub={`含 ${totalComputes} 条已计算`}
          icon={<LayoutDashboard size={20} />}
        />
        <StatCard
          accent="amber"
          label="待确认（方向）"
          value={stats.pendingDirection}
          sub={stats.pendingDirection > 0 ? '需先确认后才能计算' : '全部就绪'}
          icon={<Navigation size={20} />}
        />
        <StatCard
          accent="coral"
          label="异常队列"
          value={stats.anomalyQueue}
          sub={stats.anomalyQueue > 0 ? 'OPEN 状态待处理' : '全部已处理'}
          icon={<AlertTriangle size={20} />}
        />
        <StatCard
          accent="moss"
          label="人工改判"
          value={stats.manualOverride}
          sub="已标注改判原因"
          icon={<User size={20} />}
        />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-primary flex items-center gap-2">
              <AlertTriangle size={18} className="text-coral" /> TOP 5 待处理异常
            </h3>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/handover')}
            >
              交付视图 <ArrowRight size={13} />
            </button>
          </div>
          {stats.topAnomalies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">暂无异常</div>
              <div className="empty-state-desc">所有队列项均已处理完成</div>
            </div>
          ) : (
            <div>
              {stats.topAnomalies.map((a) => (
                <div key={a.id} className="list-item" onClick={() => openAnomaly(a)}>
                  <div
                    className="list-item-icon"
                    style={{
                      background: a.status === 'open' ? 'var(--coral-bg)' : 'var(--amber-bg)',
                    }}
                  >
                    <AlertTriangle
                      size={18}
                      color={a.status === 'open' ? 'var(--coral)' : 'var(--amber)'}
                    />
                  </div>
                  <div className="list-item-content">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge kind={{ type: 'anomalyType', value: a.type }} size="sm" />
                      <StatusBadge kind={{ type: 'anomaly', value: a.status }} size="sm" />
                      <span className="font-mono text-xs text-gray-500">{a.id.slice(-6)}</span>
                    </div>
                    <div className="list-item-title truncate">{a.reason}</div>
                    <div className="list-item-desc truncate">{a.impact || '—'}</div>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <ArrowRight size={15} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5 flex flex-col">
          <h3 className="text-lg font-serif font-semibold text-primary flex items-center gap-2 mb-4">
            <PieChartIcon size={18} className="text-primary" /> 结果分布
          </h3>
          {totalComputes === 0 ? (
            <div className="empty-state flex-1 flex flex-col items-center justify-center py-8">
              <div className="empty-state-title">暂无计算数据</div>
              <div className="empty-state-desc">请先在计算改判页执行计算</div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={RESULT_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: '1px solid var(--gray-200)',
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} 条 (${totalComputes ? ((value / totalComputes) * 100).toFixed(1) : 0}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 mb-2">快捷入口</div>
            <div className="grid grid-cols-3 gap-2">
              <div
                className="quick-card !p-3 !gap-2 cursor-pointer"
                onClick={() => navigate('/logs')}
              >
                <div
                  className="quick-card-icon !w-9 !h-9"
                  style={{ background: 'rgba(11, 37, 69, 0.08)' }}
                >
                  <Upload size={17} color="var(--primary)" />
                </div>
                <div className="quick-card-text">
                  <div className="quick-card-title !text-xs">导入日志</div>
                </div>
              </div>
              <div
                className="quick-card !p-3 !gap-2 cursor-pointer"
                onClick={() => navigate('/compute')}
              >
                <div
                  className="quick-card-icon !w-9 !h-9"
                  style={{ background: 'rgba(217, 119, 6, 0.1)' }}
                >
                  <Calculator size={17} color="var(--amber)" />
                </div>
                <div className="quick-card-text">
                  <div className="quick-card-title !text-xs">去计算改判</div>
                </div>
              </div>
              <div
                className="quick-card !p-3 !gap-2 cursor-pointer"
                onClick={() => navigate('/handover')}
              >
                <div
                  className="quick-card-icon !w-9 !h-9"
                  style={{ background: 'rgba(5, 150, 105, 0.1)' }}
                >
                  <Download size={17} color="var(--moss)" />
                </div>
                <div className="quick-card-text">
                  <div className="quick-card-title !text-xs">导出交付</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="quick-card" onClick={() => navigate('/logs')}>
          <div
            className="quick-card-icon"
            style={{ background: 'rgba(11, 37, 69, 0.08)' }}
          >
            <FileSpreadsheet size={22} color="var(--primary)" />
          </div>
          <div className="quick-card-text">
            <div className="quick-card-title">导入传感器日志</div>
            <div className="quick-card-desc">CSV 上传或文本粘贴，自动解析与方向预检</div>
          </div>
          <ArrowRight size={18} className="text-gray-400" />
        </div>
        <div className="quick-card" onClick={() => navigate('/compute')}>
          <div
            className="quick-card-icon"
            style={{ background: 'rgba(217, 119, 6, 0.1)' }}
          >
            <Calculator size={22} color="var(--amber)" />
          </div>
          <div className="quick-card-text">
            <div className="quick-card-title">预警计算与人工改判</div>
            <div className="quick-card-desc">阈值与公式可配置，人工改判留痕</div>
          </div>
          <ArrowRight size={18} className="text-gray-400" />
        </div>
        <div className="quick-card" onClick={() => navigate('/handover')}>
          <div
            className="quick-card-icon"
            style={{ background: 'rgba(5, 150, 105, 0.1)' }}
          >
            <Download size={22} color="var(--moss)" />
          </div>
          <div className="quick-card-text">
            <div className="quick-card-title">导出交付快照</div>
            <div className="quick-card-desc">CSV / JSON 格式，三联对齐数据</div>
          </div>
          <ArrowRight size={18} className="text-gray-400" />
        </div>
      </div>
      <EventDrawer
        open={drawerRowId !== null}
        onClose={() => setDrawerRowId(null)}
        row={targetRow}
        compute={targetCompute}
        anomaly={targetAnomalies[0]}
      />
    </div>
  )
}

export default Dashboard
