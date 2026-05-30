import { useAnalysis } from '../context/AnalysisContext';
import { downloadCSV, downloadJSON } from '../utils/exportService';

export default function Toolbar() {
  const { state, loadMockData } = useAnalysis();
  const { snapshot, isAnalyzing } = state;

  const handleExportCSV = () => {
    if (snapshot) {
      downloadCSV(snapshot);
    }
  };

  const handleExportJSON = () => {
    if (snapshot) {
      downloadJSON(snapshot);
    }
  };

  return (
    <div className="bg-primary-800 text-white px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <svg
              className="w-8 h-8 text-primary-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <h1 className="text-xl font-bold">几何测量误差校正分析看板</h1>
          </div>
          {snapshot && (
            <span className="bg-primary-700 px-3 py-1 rounded text-sm">
              批次: {snapshot.batchNo}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadMockData}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 
                       border-2 border-primary-500 rounded text-sm font-medium
                       transition-all duration-200 hover:-translate-y-0.5
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                分析中...
              </span>
            ) : (
              '加载样例数据'
            )}
          </button>

          {snapshot && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-industrial-green hover:bg-green-600
                           border-2 border-green-500 rounded text-sm font-medium
                           transition-all duration-200 hover:-translate-y-0.5"
              >
                导出 CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500
                           border-2 border-primary-500 rounded text-sm font-medium
                           transition-all duration-200 hover:-translate-y-0.5"
              >
                导出 JSON
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
