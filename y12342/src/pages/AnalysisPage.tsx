import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  FileWarning,
  ArrowRight,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { getAnomalyTypeName, getStatusName } from '@/utils/calculationEngine'

export default function AnalysisPage() {
  const navigate = useNavigate()
  const { collisions, importedFiles } = useAppStore()

  const speedSource = importedFiles.find((f) => f.type === 'speed')?.name || '未导入'
  const massSource = importedFiles.find((f) => f.type === 'mass')?.name || '未导入'

  const momentumData = collisions.map((c) => ({
    name: c.collisionTimeFormatted,
    碰撞前: Number(c.calculationResult.totalMomentumBefore.toFixed(4)),
    碰撞后: Number(c.calculationResult.totalMomentumAfter.toFixed(4)),
  }))

  const energyData = collisions.map((c) => ({
    name: c.collisionTimeFormatted,
    碰撞前: Number(c.calculationResult.totalKineticEnergyBefore.toFixed(4)),
    碰撞后: Number(c.calculationResult.totalKineticEnergyAfter.toFixed(4)),
    损失: Number(c.calculationResult.energyLoss.toFixed(4)),
  }))

  const stats = {
    total: collisions.length,
    normal: collisions.filter((c) => c.status === 'normal').length,
    warning: collisions.filter((c) => c.status === 'warning').length,
    error: collisions.filter((c) => c.status === 'error').length,
    avgEnergyLoss:
      collisions.length > 0
        ? (
            collisions.reduce((s, c) => s + c.calculationResult.energyLossPercent, 0) /
            collisions.length
          ).toFixed(2)
        : '0.00',
  }

  const allAnomalies = collisions.flatMap((c) =>
    c.anomalies.map((a) => ({
      ...a,
      collisionTime: c.collisionTimeFormatted,
      collisionId: c.id,
    }))
  )

  if (collisions.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in-up">
        <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
          <Zap className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">暂无碰撞数据</h2>
        <p className="text-slate-500 mb-6">请先导入数据并进行分析</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          前往数据导入
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">分析概览</h2>
        <p className="mt-2 text-slate-600">
          共检测到 {collisions.length} 次碰撞事件，点击卡片查看详细计算过程
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 card-hover">
          <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-sm text-slate-500 mt-1">总碰撞次数</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 card-hover">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-3xl font-bold text-green-600">{stats.normal}</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">正常</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 card-hover">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span className="text-3xl font-bold text-amber-600">{stats.warning}</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">警告</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 card-hover">
          <div className="flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-500" />
            <span className="text-3xl font-bold text-red-600">{stats.error}</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">异常</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">动量对比</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={momentumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `${value} kg·m/s`}
              />
              <Legend />
              <Bar dataKey="碰撞前" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="碰撞后" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">能量变化趋势</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `${value} J`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="碰撞前"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="碰撞后"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="损失"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444' }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">碰撞事件列表</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {collisions.map((collision) => (
            <div
              key={collision.id}
              className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/detail/${collision.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      collision.status === 'normal'
                        ? 'bg-green-500'
                        : collision.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    } ${collision.status !== 'normal' ? 'animate-pulse-slow' : ''}`}
                  />
                  <div>
                    <div className="font-medium text-slate-800">
                      碰撞时间: {collision.collisionTimeFormatted}
                    </div>
                    <div className="text-sm text-slate-500">
                      参与小球: {collision.ballIds.join(', ')} · 状态:{' '}
                      {getStatusName(collision.status)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-slate-600">
                      能量损失: {(collision.calculationResult.energyLossPercent * 100).toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400">
                      动量差异: {(collision.calculationResult.momentumDifferencePercent * 100).toFixed(2)}%
                    </div>
                  </div>
                  {collision.anomalies.length > 0 && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md flex items-center gap-1">
                      <FileWarning className="w-3 h-3" />
                      {collision.anomalies.length} 个异常
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {allAnomalies.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">异常检测汇总</h3>
          </div>
          <div className="space-y-3">
            {allAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="bg-white rounded-lg p-4 border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors"
                onClick={() => navigate(`/detail/${anomaly.collisionId}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-md mr-2 ${
                        anomaly.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : anomaly.severity === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {anomaly.severity === 'high' ? '高' : anomaly.severity === 'medium' ? '中' : '低'}
                    </span>
                    <span className="font-medium text-slate-800">
                      {getAnomalyTypeName(anomaly.type)}
                    </span>
                    <span className="text-sm text-slate-500 ml-2">
                      碰撞时间: {anomaly.collisionTime}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="mt-2 text-sm text-slate-600">{anomaly.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-4">数据来源</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">V</span>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">速度记录</div>
              <div className="text-xs text-slate-500">{speedSource}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-600 font-bold text-sm">M</span>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">质量表</div>
              <div className="text-xs text-slate-500">{massSource}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
