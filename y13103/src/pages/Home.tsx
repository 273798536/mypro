import { useEffect } from 'react'
import { useRegressionStore } from '@/store/regression'
import SessionPanel from '@/components/SessionPanel'
import MaterialPanel from '@/components/MaterialPanel'
import RegressionChart from '@/components/RegressionChart'
import ReportPanel from '@/components/ReportPanel'
import { BarChart3 } from 'lucide-react'

export default function Home() {
  const { fetchSessions, currentSession, result, data, loading, error, clearError } = useRegressionStore()

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">分段回归图表解释</h1>
          {currentSession && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              当前会话: {currentSession.name}
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                currentSession.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                currentSession.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                currentSession.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {currentSession.status === 'idle' ? '待计算' :
                 currentSession.status === 'running' ? '计算中' :
                 currentSession.status === 'completed' ? '已完成' : '错误'}
              </span>
            </span>
          )}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            处理中...
          </div>
        )}
      </header>

      {error && (
        <div className="mx-6 mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700 text-sm font-medium">关闭</button>
        </div>
      )}

      <div className="flex h-[calc(100vh-57px)]">
        <aside className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex-shrink-0">
          <SessionPanel />
        </aside>

        <main className="flex-1 overflow-y-auto">
          {!currentSession ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">请选择或创建一个分段回归会话</p>
                <p className="text-sm mt-1">在左侧面板中新建或选择会话开始分析</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <section>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">回归图表</h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  {result ? (
                    <RegressionChart
                      segments={result.segments}
                      breakpoints={result.breakpoints}
                      data={data}
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                      添加数据并点击"计算"以生成图表
                    </div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">材料管理</h2>
                  <MaterialPanel />
                </section>
                <section>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">分析报告</h2>
                  <ReportPanel />
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
