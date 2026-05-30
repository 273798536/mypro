import { useAnalysis } from '../context/AnalysisContext';

export default function StatsCards() {
  const { state } = useAnalysis();
  const { snapshot } = state;

  if (!snapshot) {
    return null;
  }

  const { fittingParams, statistics, missingPoints, contaminatedPoints } = snapshot;

  const offsetDirection = fittingParams.systematicOffset >= 0 ? '+' : '';
  const offsetClass =
    Math.abs(fittingParams.systematicOffset) > 0.01
      ? 'text-industrial-orange'
      : 'text-industrial-green';

  const hasAnomalies =
    missingPoints.length > 0 || contaminatedPoints.length > 0;

  const cards = [
    {
      title: '夹具偏移量',
      value: `${offsetDirection}${fittingParams.systematicOffset.toFixed(6)} mm`,
      subValue: `R² = ${fittingParams.rSquared.toFixed(4)}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      valueClass: offsetClass,
    },
    {
      title: '平均误差',
      value: `${statistics.avgErrorAfter.toFixed(6)} mm`,
      subValue: `校正前: ${statistics.avgErrorBefore.toFixed(6)} mm`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      trend:
        statistics.avgErrorAfter < statistics.avgErrorBefore
          ? { value: '下降', positive: true }
          : { value: '上升', positive: false },
    },
    {
      title: '合格率',
      value: `${(statistics.passRate * 100).toFixed(1)}%`,
      subValue: `${snapshot.validPoints - statistics.failCount} / ${snapshot.validPoints} 合格`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      valueClass:
        statistics.passRate >= 0.95
          ? 'text-industrial-green'
          : statistics.passRate >= 0.8
          ? 'text-industrial-orange'
          : 'text-industrial-red',
    },
    {
      title: '异常记录',
      value: `${missingPoints.length + contaminatedPoints.length} 条`,
      subValue:
        missingPoints.length > 0 || contaminatedPoints.length > 0
          ? `缺失: ${missingPoints.length}, 混批: ${contaminatedPoints.length}`
          : '无异常',
      icon: (
        <svg
          className={`w-6 h-6 ${hasAnomalies ? 'animate-pulse text-industrial-red' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      valueClass: hasAnomalies ? 'text-industrial-red' : 'text-industrial-green',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border-2 border-gray-200 p-5 
                     shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">{card.title}</p>
              <p className={`text-2xl font-mono font-bold mt-1 ${card.valueClass || 'text-gray-800'}`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {card.subValue}
                {card.trend && (
                  <span
                    className={`ml-2 ${card.trend.positive ? 'text-industrial-green' : 'text-industrial-red'}`}
                  >
                    {card.trend.positive ? '↓' : '↑'} {card.trend.value}
                  </span>
                )}
              </p>
            </div>
            <div className="p-2 bg-gray-100 rounded text-gray-600">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
