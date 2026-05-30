import { useAnalysis } from '../context/AnalysisContext';
import { getAnomalyInfo } from '../utils/anomalyDetection';
import { mockMeasurementPoints } from '../data/mockData';

export default function TraceabilityDrawer() {
  const { state, toggleDrawer } = useAnalysis();
  const { selectedPoint, isDrawerOpen, snapshot } = state;

  if (!selectedPoint || !snapshot) {
    return null;
  }

  const rawPoint = mockMeasurementPoints.find(p => p.id === selectedPoint.pointId);
  const anomalyInfo = getAnomalyInfo(selectedPoint);

  const handleClose = () => {
    toggleDrawer(false);
  };

  return (
    <>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleClose}
        />
      )}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 drawer-transition transform ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {selectedPoint.pointName} 溯源详情
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                数据引用: {selectedPoint.rawDataRef}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                异常状态
              </h4>
              <div
                className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-lg border ${
                  anomalyInfo.type === 'missing'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : anomalyInfo.type === 'contaminated'
                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                    : anomalyInfo.type === 'out_of_tolerance'
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                    : 'bg-green-100 text-green-800 border-green-300'
                }`}
              >
                {anomalyInfo.message}
              </div>
              {anomalyInfo.type === 'contaminated' && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ 该测点夹具ID ({selectedPoint.fixtureId}) 与批次主流夹具不一致，已被标记为混入数据，不参与拟合计算。
                </p>
              )}
              {anomalyInfo.type === 'missing' && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ 该测点数据缺失，请检查原始测量文件。
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                原始数据
              </h4>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">批次号</dt>
                  <dd className="font-mono font-medium text-gray-900">{snapshot.batchNo}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">夹具ID</dt>
                  <dd className={`font-mono font-medium ${selectedPoint.isContaminated ? 'text-industrial-orange' : 'text-gray-900'}`}>
                    {selectedPoint.fixtureId}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">测量时间</dt>
                  <dd className="font-mono text-gray-900">{rawPoint?.measureTime || '---'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">操作员</dt>
                  <dd className="font-mono text-gray-900">{rawPoint?.operator || '---'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">原始数据引用</dt>
                  <dd className="font-mono text-gray-900">{selectedPoint.rawDataRef}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                尺寸对比
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">设计尺寸</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {selectedPoint.designSize.toFixed(4)} ± {selectedPoint.tolerance} mm
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="text-sm text-gray-600">测量值</span>
                  <span className={`font-mono font-semibold ${selectedPoint.isMissing ? 'text-gray-400' : 'text-blue-600'}`}>
                    {selectedPoint.isMissing ? '---' : `${selectedPoint.measuredValue.toFixed(4)} mm`}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm text-gray-600">校正值</span>
                  <span className={`font-mono font-semibold ${selectedPoint.isPass ? 'text-industrial-green' : 'text-industrial-red'}`}>
                    {selectedPoint.isMissing ? '---' : `${selectedPoint.correctedValue.toFixed(4)} mm`}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span className="text-sm text-gray-600">残差</span>
                  <span className="font-mono text-gray-700">
                    {selectedPoint.isMissing ? '---' : selectedPoint.residual.toFixed(6)}
                  </span>
                </div>
              </div>
            </div>

            {rawPoint?.remeasureRecords && rawPoint.remeasureRecords.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  复测记录
                </h4>
                <div className="space-y-2">
                  {rawPoint.remeasureRecords.map((record) => (
                    <div key={record.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-semibold text-purple-700">
                            {record.measuredValue.toFixed(4)} mm
                          </p>
                          <p className="text-xs text-purple-500 mt-1">
                            {record.measureTime} · {record.operator}
                          </p>
                        </div>
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                          {record.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                校正参数
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">夹具偏移量</dt>
                  <dd className="font-mono">
                    {snapshot.fittingParams.systematicOffset >= 0 ? '+' : ''}
                    {snapshot.fittingParams.systematicOffset.toFixed(6)} mm
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">拟合公式</dt>
                  <dd className="font-mono text-xs">
                    y = {snapshot.fittingParams.slope.toFixed(4)}x + {snapshot.fittingParams.intercept.toFixed(4)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">R²</dt>
                  <dd className="font-mono">{snapshot.fittingParams.rSquared.toFixed(4)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>分析时间: {new Date(snapshot.timestamp).toLocaleString()}</span>
              <span>数据哈希: {snapshot.dataHash.slice(0, 12)}...</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
