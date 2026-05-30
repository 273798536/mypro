import { useAnalysis } from '../context/AnalysisContext';
import { getAnomalyInfo, getAnomalyBadgeColor } from '../utils/anomalyDetection';

export default function DataTable() {
  const { state, selectPoint, toggleDrawer } = useAnalysis();
  const { snapshot } = state;

  if (!snapshot) {
    return null;
  }

  const { correctedPoints } = snapshot;

  const handleTraceClick = (point: typeof correctedPoints[0]) => {
    selectPoint(point);
    toggleDrawer(true);
  };

  const getRowClass = (point: typeof correctedPoints[0]) => {
    if (point.isMissing || point.isContaminated) {
      return 'bg-red-50 border-l-4 border-red-500 anomaly-row';
    }
    if (!point.isPass) {
      return 'bg-yellow-50 border-l-4 border-yellow-500';
    }
    return 'hover:bg-gray-50 border-l-4 border-transparent';
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">测量点明细表</h3>
        <p className="text-sm text-gray-500 mt-1">
          共 {correctedPoints.length} 条记录，其中 {correctedPoints.filter(p => !p.isMissing && !p.isContaminated && p.isPass).length} 条合格
        </p>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                测量点
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                夹具ID
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                设计尺寸
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                测量值
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                校正值
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                残差
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {correctedPoints.map((point) => {
              const anomalyInfo = getAnomalyInfo(point);
              const badgeClass = getAnomalyBadgeColor(anomalyInfo.type);

              return (
                <tr
                  key={point.pointId}
                  className={`${getRowClass(point)} transition-colors cursor-pointer`}
                  onClick={() => handleTraceClick(point)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono font-semibold text-gray-900">
                      {point.pointName}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-mono text-sm ${point.isContaminated ? 'text-industrial-orange font-bold' : 'text-gray-600'}`}>
                      {point.fixtureId}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-sm text-gray-600">
                    {point.designSize.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-sm">
                    <span className={point.isMissing ? 'text-gray-400 italic' : 'text-gray-900'}>
                      {point.isMissing ? '---' : point.measuredValue.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-sm">
                    <span className={`font-semibold ${point.isPass && !point.isMissing ? 'text-industrial-green' : point.isMissing ? 'text-gray-400' : 'text-industrial-red'}`}>
                      {point.isMissing ? '---' : point.correctedValue.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-sm text-gray-500">
                    {point.isMissing ? '---' : point.residual.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${badgeClass}`}
                    >
                      {anomalyInfo.message}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTraceClick(point);
                      }}
                    >
                      溯源
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
