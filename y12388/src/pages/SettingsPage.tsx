import { useState, useEffect } from 'react'
import {
  Settings,
  Database,
  RefreshCw,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '@/components/Card'
import { resetMockData, clearMockData } from '@/data/mockData'
import { dataService } from '@/services/DataService'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [dbStats, setDbStats] = useState<Record<string, number> | null>(null)
  const [actionStatus, setActionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    loadDbStats()
  }, [])

  const loadDbStats = async () => {
    const stats = await dataService.getStats()
    setDbStats({
      registrations: stats.total,
    })
  }

  const handleResetData = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }

    try {
      await resetMockData()
      setActionStatus('success')
      setConfirmReset(false)
      loadDbStats()
      setTimeout(() => setActionStatus('idle'), 3000)
    } catch (error) {
      setActionStatus('error')
      setTimeout(() => setActionStatus('idle'), 3000)
    }
  }

  const handleClearData = async () => {
    try {
      await clearMockData()
      setActionStatus('success')
      loadDbStats()
      setTimeout(() => setActionStatus('idle'), 3000)
    } catch (error) {
      setActionStatus('error')
      setTimeout(() => setActionStatus('idle'), 3000)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 系统信息 */}
      <Card title="系统信息" subtitle="关于乐器考级报名审核工作台">
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-primary-800">乐器考级报名审核工作台</h4>
              <p className="text-sm text-primary-600 mt-1">版本 1.0.0</p>
              <p className="text-sm text-primary-700 mt-2">
                本地 Web 应用，所有数据存储在浏览器本地，确保数据安全和隐私保护。
                支持曲目核对、缴费确认、证件查验等完整审核流程，并保留完整证据链。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h5 className="font-medium text-slate-700 mb-2">技术栈</h5>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• React 18 + TypeScript</li>
                <li>• Vite 构建工具</li>
                <li>• TailwindCSS 样式</li>
                <li>• IndexedDB 本地存储</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h5 className="font-medium text-slate-700 mb-2">核心特性</h5>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• 完整证据链保留</li>
                <li>• 版本快照机制</li>
                <li>• 人话版审核报告</li>
                <li>• Excel 批量导出</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* 数据管理 */}
      <Card title="数据管理" subtitle="本地数据库操作">
        <div className="space-y-4">
          {/* 数据统计 */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h5 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              当前数据统计
            </h5>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600">{dbStats?.registrations || 0}</p>
                <p className="text-sm text-slate-500">报名记录</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-600">-</p>
                <p className="text-sm text-slate-500">材料数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-600">-</p>
                <p className="text-sm text-slate-500">曲目数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-600">-</p>
                <p className="text-sm text-slate-500">备注数</p>
              </div>
            </div>
          </div>

          {/* 重置数据 */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-medium text-amber-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  重置示例数据
                </h5>
                <p className="text-sm text-amber-700 mt-1">
                  重新生成模拟的报名数据，用于演示和测试
                </p>
              </div>
              <button
                onClick={handleResetData}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  confirmReset
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                )}
              >
                {confirmReset ? '确认重置？' : '重置数据'}
              </button>
            </div>
            {confirmReset && (
              <p className="text-xs text-red-600 mt-2">
                ⚠️ 此操作将删除所有现有数据并重新生成示例数据
              </p>
            )}
          </div>

          {/* 清空数据 */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-medium text-red-800 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  清空所有数据
                </h5>
                <p className="text-sm text-red-700 mt-1">
                  删除所有报名记录、历史记录和版本快照
                </p>
              </div>
              <button
                onClick={handleClearData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                清空数据
              </button>
            </div>
          </div>

          {/* 状态提示 */}
          {actionStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>操作成功</span>
            </div>
          )}

          {actionStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>操作失败，请重试</span>
            </div>
          )}
        </div>
      </Card>

      {/* 使用说明 */}
      <Card title="使用说明">
        <div className="space-y-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary-600 font-semibold text-xs">1</span>
            </div>
            <div>
              <p className="font-medium text-slate-700">报名列表</p>
              <p>查看所有报名记录，支持按状态、级别、关键词筛选。可批量导出Excel和异常报告。</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary-600 font-semibold text-xs">2</span>
            </div>
            <div>
              <p className="font-medium text-slate-700">详情审核</p>
              <p>逐项核对材料、曲目版本、缴费状态和证件完整性。添加老师备注作为补充证据。</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary-600 font-semibold text-xs">3</span>
            </div>
            <div>
              <p className="font-medium text-slate-700">历史追溯</p>
              <p>查看完整操作历史和版本快照，每次修改自动保存，确保证据不被覆盖。</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary-600 font-semibold text-xs">4</span>
            </div>
            <div>
              <p className="font-medium text-slate-700">生成报告</p>
              <p>一键生成人话版审核报告，可直接转发给非技术同事查看。</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
