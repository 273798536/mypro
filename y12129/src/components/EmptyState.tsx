import { useAnalysis } from '../context/AnalysisContext';

export default function EmptyState() {
  const { loadMockData, state } = useAnalysis();
  const { isAnalyzing } = state;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">
        几何测量误差校正分析看板
      </h2>
      <p className="text-gray-500 mb-6 max-w-md">
        导入测量数据包，系统将自动执行最小二乘拟合，计算夹具偏移量，
        标记批次混入和点位缺失，确保每条判断都可追溯到原始数据。
      </p>
      <div className="space-y-3">
        <button
          onClick={loadMockData}
          disabled={isAnalyzing}
          className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white
                     border-2 border-primary-500 rounded-lg font-medium
                     transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              分析中...
            </span>
          ) : (
            '加载样例数据试试'
          )}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        <div className="p-4 bg-white rounded-lg border border-gray-200 text-left">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">正常记录</h3>
          <p className="text-xs text-gray-500 mt-1">夹具ID一致，数据完整</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200 text-left">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">批次混入</h3>
          <p className="text-xs text-gray-500 mt-1">夹具ID不一致，自动标记</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200 text-left">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">点位缺失</h3>
          <p className="text-xs text-gray-500 mt-1">测量数据缺失，高亮显示</p>
        </div>
      </div>
    </div>
  );
}
