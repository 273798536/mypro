import { useState, useEffect } from 'react'
import {
  Download,
  FileSpreadsheet,
  FileText,
  Database,
  Upload,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Users,
  Clock,
  FileWarning,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card } from '@/components/Card'
import { cn } from '@/lib/utils'

export default function ExportCenter() {
  const { stats, loadStats, exportToExcel, exportAnomalyReport, exportAllData, importAllData, loading } = useAppStore()
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadStats()
  }, [])

  const handleExportAll = () => {
    exportAllData()
  }

  const handleImportAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await importAllData(file)
      setImportStatus('success')
      loadStats()
      setTimeout(() => setImportStatus('idle'), 3000)
    } catch (error) {
      setImportStatus('error')
      setTimeout(() => setImportStatus('idle'), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
              <p className="text-sm text-slate-500">总报名数</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.passed || 0}</p>
              <p className="text-sm text-slate-500">审核通过</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.pending || 0}</p>
              <p className="text-sm text-slate-500">待处理</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.hasAnomalies || 0}</p>
              <p className="text-sm text-slate-500">存在异常</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 数据导出 */}
        <Card title="数据导出" subtitle="导出完整数据用于备份或分享">
          <div className="space-y-4">
            <button
              onClick={() => exportToExcel()}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-slate-900">导出报名列表</h4>
                <p className="text-sm text-slate-500">导出为 Excel 文件，包含所有报名信息</p>
              </div>
              <Download className="w-5 h-5 text-primary-600 ml-auto" />
            </button>

            <button
              onClick={exportAnomalyReport}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <FileWarning className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-slate-900">导出异常报告</h4>
                <p className="text-sm text-slate-500">包含异常统计和明细，用于事后复盘</p>
              </div>
              <Download className="w-5 h-5 text-orange-600 ml-auto" />
            </button>

            <button
              onClick={handleExportAll}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-slate-900">导出完整备份</h4>
                <p className="text-sm text-slate-500">包含所有历史记录和版本快照的 JSON 备份</p>
              </div>
              <Download className="w-5 h-5 text-slate-600 ml-auto" />
            </button>
          </div>
        </Card>

        {/* 数据导入 */}
        <Card title="数据导入" subtitle="从备份文件恢复数据">
          <div className="space-y-4">
            <label className="block">
              <div className="w-full flex items-center gap-4 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:border-primary-400 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-slate-900">选择备份文件</h4>
                  <p className="text-sm text-slate-500">支持 JSON 格式的完整数据备份</p>
                </div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportAll}
                className="hidden"
              />
            </label>

            {importStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span>数据导入成功</span>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span>数据导入失败，请检查文件格式</span>
              </div>
            )}

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                注意事项
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 导入操作将覆盖现有数据</li>
                <li>• 请确保导入前已备份当前数据</li>
                <li>• 仅支持本系统导出的 JSON 文件</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* 异常分布 */}
        <Card title="异常分布" subtitle="各类异常的数量统计" className="col-span-2">
          {stats?.anomalyStats && Object.keys(stats.anomalyStats).length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(stats.anomalyStats).map(([type, count]) => {
                const countNum = Number(count) || 0
                return (
                  <div
                    key={type}
                    className={cn(
                      'p-4 rounded-lg border',
                      type === 'repertoire_mismatch' && 'bg-orange-50 border-orange-200',
                      type === 'payment_late' && 'bg-orange-50 border-orange-200',
                      type === 'document_missing' && 'bg-orange-50 border-orange-200',
                      type === 'teacher_contradiction' && 'bg-amber-50 border-amber-200',
                      type === 'material_incomplete' && 'bg-yellow-50 border-yellow-200'
                    )}
                  >
                    <p className="text-3xl font-bold text-slate-900">{countNum}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {type === 'repertoire_mismatch' && '曲目版本不符'}
                      {type === 'payment_late' && '缴费晚到'}
                      {type === 'document_missing' && '证件缺失'}
                      {type === 'teacher_contradiction' && '老师补充说明'}
                      {type === 'material_incomplete' && '材料不完整'}
                    </p>
                    <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          type === 'teacher_contradiction' ? 'bg-amber-500' : 'bg-orange-500'
                        )}
                        style={{
                          width: `${(countNum / (stats?.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      占比 {((countNum / (stats?.total || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无异常数据</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
