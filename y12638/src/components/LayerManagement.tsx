import { BatchData } from '../useAppState';

interface Props {
  batchData: BatchData | null;
}

export default function LayerManagement({ batchData }: Props) {
  if (!batchData) {
    return (
      <div className="text-center py-12 text-gray-500">
        请从左侧选择一个批次查看
      </div>
    );
  }

  const { coordRecords, devices, conflicts } = batchData;
  const baseCoords = coordRecords.filter(c => c.source === '底图坐标');
  const trackCoords = coordRecords.filter(c => c.source === '轨迹记录');

  const getDeviceName = (deviceId: string) => {
    return devices.find(d => d.id === deviceId)?.name || deviceId;
  };

  const hasConflict = (deviceId: string) => {
    return conflicts.some(c => c.deviceId === deviceId && c.status !== '通过');
  };

  const allX = coordRecords.map(c => c.x);
  const allY = coordRecords.map(c => c.y);
  const minX = Math.min(...allX) - 30;
  const maxX = Math.max(...allX) + 30;
  const minY = Math.min(...allY) - 30;
  const maxY = Math.max(...allY) + 30;
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">图层视图</h3>
          <div className="flex space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">底图坐标 ({baseCoords.length})</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">轨迹记录 ({trackCoords.length})</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-red-500 rounded-full mr-2"></div>
              <span className="text-gray-600">存在冲突</span>
            </div>
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="relative h-96 bg-white border rounded overflow-hidden">
            <svg className="w-full h-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="url(#grid)" />

              {coordRecords.map(coord => {
                const isConflict = hasConflict(coord.deviceId);
                if (coord.source === '底图坐标') {
                  const matchingTrack = trackCoords.find(t => t.deviceId === coord.deviceId);
                  if (matchingTrack) {
                    return (
                      <g key={`line-${coord.id}`}>
                        <line
                          x1={coord.x}
                          y1={coord.y}
                          x2={matchingTrack.x}
                          y2={matchingTrack.y}
                          stroke={isConflict ? '#ef4444' : '#d1d5db'}
                          strokeWidth="1"
                          strokeDasharray={isConflict ? "0" : "4,4"}
                          opacity="0.6"
                        />
                      </g>
                    );
                  }
                }
                return null;
              })}

              {baseCoords.map((coord) => {
                const isConflict = hasConflict(coord.deviceId);
                return (
                  <g key={coord.id}>
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="8"
                      fill="#3b82f6"
                      opacity="0.7"
                      stroke={isConflict ? '#ef4444' : 'none'}
                      strokeWidth={isConflict ? "2" : "0"}
                    />
                    <text
                      x={coord.x + 12}
                      y={coord.y + 4}
                      fontSize="10"
                      fill="#374151"
                    >
                      {getDeviceName(coord.deviceId)}
                    </text>
                  </g>
                );
              })}

              {trackCoords.map((coord) => {
                const isConflict = hasConflict(coord.deviceId);
                return (
                  <g key={coord.id}>
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="6"
                      fill="#10b981"
                      opacity="0.8"
                      stroke={isConflict ? '#ef4444' : 'none'}
                      strokeWidth={isConflict ? "2" : "0"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            实线红边表示存在冲突的设备，虚线表示已解决或无冲突的坐标连线
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">坐标明细</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">X坐标</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Y坐标</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">采集时间</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coordRecords.map((coord) => {
                const isConflict = hasConflict(coord.deviceId);
                return (
                  <tr key={coord.id} className={isConflict ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-2 text-sm font-medium">{getDeviceName(coord.deviceId)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        coord.source === '底图坐标'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {coord.source}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-mono">{coord.x}</td>
                    <td className="px-4 py-2 text-sm font-mono">{coord.y}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {new Date(coord.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      {isConflict ? (
                        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                          有冲突
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                          正常
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
