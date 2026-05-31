import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { TrendingUp, Clock, AlertTriangle, Megaphone, ChevronRight, Copy, FileQuestion, CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { dashboard, fetchDashboard, fetchAuditLogs, auditLogs, loading } = useAppStore()

  useEffect(() => {
    fetchDashboard()
    fetchAuditLogs()
  }, [fetchDashboard, fetchAuditLogs])

  if (loading && !dashboard) {
    return <div className="flex items-center justify-center h-64">加载中...</div>
  }

  const stats = [
    {
      title: '本月支出总额',
      value: `¥${dashboard?.total_amount_this_month?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) || '0.00'}`,
      icon: TrendingUp,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700'
    },
    {
      title: '待审批数量',
      value: dashboard?.pending_approval_count || 0,
      icon: Clock,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: '公示中项目',
      value: dashboard?.publishing_count || 0,
      icon: Megaphone,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    }
  ]

  const anomalies = [
    {
      title: '发票重复',
      count: dashboard?.anomaly_count?.duplicates || 0,
      icon: Copy,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      link: '/invoices?filter=duplicate'
    },
    {
      title: '审批缺页',
      count: dashboard?.anomaly_count?.missing_pages || 0,
      icon: FileQuestion,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      link: '/approvals?filter=missing'
    },
    {
      title: '项目延期',
      count: dashboard?.anomaly_count?.delays || 0,
      icon: CalendarClock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      link: '/delays'
    }
  ]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEntityTypeText = (type: string) => {
    const map: Record<string, string> = {
      expenditure: '支出申请',
      invoice: '发票',
      approval: '审批',
      opinion: '居民意见',
      delay: '项目延期',
      disclosure: '公示'
    }
    return map[type] || type
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">财务总览</h1>
        <p className="text-slate-500 mt-1">社区基金支出公示系统</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className={`${stat.bgColor} rounded-xl p-6 border border-slate-200`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${stat.textColor}`}>{stat.title}</p>
                <p className={`text-2xl font-bold mt-2 ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-orange-500" />
          异常预警
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {anomalies.map((item, idx) => (
            <Link
              key={idx}
              to={item.link}
              className={`${item.bgColor} ${item.borderColor} border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={item.color} />
                <div>
                  <p className={`font-medium ${item.color}`}>{item.title}</p>
                  <p className={`text-2xl font-bold ${item.color} mt-1`}>{item.count}</p>
                </div>
              </div>
              <ChevronRight size={20} className={item.color} />
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">最近变更记录</h2>
        <div className="space-y-4">
          {auditLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                <div className="w-0.5 h-full bg-slate-200 mt-1"></div>
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{formatDate(log.created_at)}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {getEntityTypeText(log.entity_type)}
                  </span>
                </div>
                <p className="text-slate-700 mt-1">{log.impact_description}</p>
                <p className="text-xs text-slate-400 mt-1">操作人：{log.operator}</p>
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <p className="text-slate-400 text-center py-8">暂无变更记录</p>
          )}
        </div>
      </div>
    </div>
  )
}
