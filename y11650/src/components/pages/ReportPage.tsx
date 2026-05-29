import { useNavigate, useLocation } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { getLevelById } from '../../data/levels'
import { DISHES } from '../../data/dishes'
import { GRADE_COLORS, ALLERGEN_ICONS } from '../../types/game'
import { exportReportAsJSON, exportReportAsText } from '../../utils/reportGenerator'
import { useState } from 'react'

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const getReport = useGameStore(s => s.getReport)
  const levelId = useGameStore(s => s.levelId)
  const level = levelId ? getLevelById(levelId) : null

  const report = getReport()
  const [activeTab, setActiveTab] = useState<'unhandled' | 'corrected' | 'needReview'>('unhandled')

  const handleExportJSON = () => {
    const json = exportReportAsJSON(report)
    downloadFile(json, `cafeteria-report-${report.sessionId}.json`, 'application/json')
  }

  const handleExportText = () => {
    const text = exportReportAsText(report)
    downloadFile(text, `cafeteria-report-${report.sessionId}.txt`, 'text/plain')
  }

  const tabs = [
    { key: 'unhandled' as const, label: '📋 未处理', count: report.unhandled.length, color: 'text-warning' },
    { key: 'corrected' as const, label: '✅ 已修正', count: report.corrected.length, color: 'text-success' },
    { key: 'needReview' as const, label: '🔍 需人工确认', count: report.needReview.length, color: 'text-danger' },
  ]

  return (
    <div className="min-h-screen bg-cafeteria-bg">
      <header className="bg-gradient-to-r from-info to-blue-600 text-white py-4 px-4 shadow-lg">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-display text-3xl">📋 服务报告</h1>
          {level && <p className="text-blue-100 text-sm mt-1">{level.name} — 会话 {report.sessionId.slice(-6)}</p>}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl shadow border border-cafeteria-border p-4">
          <h3 className="font-display text-lg text-gray-700 mb-3">📊 统计概览</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-info">{report.statistics.totalOrders}</div>
              <div className="text-xs text-gray-500">总订单</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-success">{report.statistics.delivered}</div>
              <div className="text-xs text-gray-500">已交付</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-warning">{report.statistics.accuracy}%</div>
              <div className="text-xs text-gray-500">正确率</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-danger">
                {report.statistics.allergyMismatches + report.statistics.gradeMismatches}
              </div>
              <div className="text-xs text-gray-500">严重错误</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
              <div className="text-lg font-bold text-danger">{report.statistics.allergyMismatches}</div>
              <div className="text-[10px] text-red-600">过敏错配</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center border border-yellow-200">
              <div className="text-lg font-bold text-warning">{report.statistics.windowCongestions}</div>
              <div className="text-[10px] text-yellow-600">窗口拥堵</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
              <div className="text-lg font-bold text-orange-600">{report.statistics.foodWaste}</div>
              <div className="text-[10px] text-orange-600">备餐浪费</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-cafeteria-border overflow-hidden">
          <div className="flex border-b border-cafeteria-border">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'bg-primary/5 text-primary'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`ml-1 text-xs ${tab.color}`}>({tab.count})</span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="p-4 max-h-[400px] overflow-y-auto scrollbar-thin">
            {activeTab === 'unhandled' && (
              <>
                {report.unhandled.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">所有订单已处理完毕 ✅</div>
                ) : (
                  <div className="space-y-2">
                    {report.unhandled.map((order, i) => (
                      <div key={order.id} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: GRADE_COLORS[order.grade] }}>
                              {order.grade}
                            </span>
                            <span className="text-sm text-gray-700">
                              {order.dishIds.map(id => DISHES.find(d => d.id === id)?.emoji).join(' ')}
                              {order.dishIds.map(id => DISHES.find(d => d.id === id)?.name).join('+')}
                            </span>
                          </div>
                          <span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded">
                            {order.status === 'pending' ? '待处理' : order.status === 'preparing' ? '备餐中' : '待取餐'}
                          </span>
                        </div>
                        {order.allergens.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {order.allergens.map(a => (
                              <span key={a} className="text-[10px] bg-red-100 text-red-600 px-1 rounded">
                                {ALLERGEN_ICONS[a]} {a}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1">订单 #{order.id.slice(-4)} | 修正次数: {order.correctionCount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'corrected' && (
              <>
                {report.corrected.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">暂无已修正记录</div>
                ) : (
                  <div className="space-y-2">
                    {report.corrected.map((action, i) => (
                      <div key={action.id} className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-700">{action.action}</span>
                          <span className="text-xs font-bold text-success">+{action.points}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          来源: {action.source || '系统'} | 时间: {Math.round(action.timestamp)}秒
                          {action.orderId && ` | 订单 #${action.orderId.slice(-4)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'needReview' && (
              <>
                {report.needReview.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">无严重问题，无需人工确认 ✅</div>
                ) : (
                  <div className="space-y-2">
                    {report.needReview.map((action, i) => (
                      <div key={action.id} className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-700 font-medium">{action.action}</span>
                          <span className="text-xs font-bold text-danger">{action.points}分</span>
                        </div>
                        <div className="mt-1 bg-white/50 rounded p-2 text-[10px] text-gray-500">
                          <div>类别: {action.category === 'allergy_mismatch' ? '过敏错配' : '年级错配'}</div>
                          <div>来源: {action.source || '系统'}</div>
                          <div>时间: {Math.round(action.timestamp)}秒</div>
                          {action.orderId && <div>订单: #{action.orderId.slice(-4)}</div>}
                          <div>详细: {JSON.stringify(action.details)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-cafeteria-border p-4">
          <h3 className="font-display text-lg text-gray-700 mb-3">💾 导出报告</h3>
          <div className="flex gap-3">
            <button
              onClick={handleExportJSON}
              className="flex-1 py-2.5 bg-info hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              📄 导出 JSON
            </button>
            <button
              onClick={handleExportText}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              📝 导出文本
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-display text-lg transition-colors"
          >
            ← 返回结算
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-display text-lg transition-colors shadow-md"
          >
            🏠 返回首页
          </button>
        </div>
      </main>
    </div>
  )
}
