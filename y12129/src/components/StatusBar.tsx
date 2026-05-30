import { useAnalysis } from '../context/AnalysisContext';

export default function StatusBar() {
  const { state } = useAnalysis();
  const { snapshot } = state;

  if (!snapshot) {
    return null;
  }

  return (
    <div className="bg-gray-800 text-gray-300 px-6 py-3 mt-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center space-x-6">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            数据源: {snapshot.sourceFileName}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {snapshot.totalPoints} 条记录 · {snapshot.validPoints} 条有效
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <span>
            数据哈希: <span className="font-mono text-primary-400">{snapshot.dataHash.slice(0, 16)}...</span>
          </span>
          <span>
            分析时间: {new Date(snapshot.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
