import { RawPoint } from '../types';
import { formatDistance } from '../utils/geo';

interface CoordinateDisplayProps {
  rawPoint: RawPoint;
  canonicalLat: number;
  canonicalLng: number;
}

export function CoordinateDisplay({
  rawPoint, canonicalLat, canonicalLng }: CoordinateDisplayProps) {
  const influenceRadius = rawPoint.influenceRadius;

  const latDiff = rawPoint.rawLat - canonicalLat;
  const lngDiff = rawPoint.rawLng - canonicalLng;

  return (
    <div className={`p-4 rounded border ${
      rawPoint.isOffset ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-gray-700 font-serif-cn">
          {rawPoint.rawName}
        </div>
        {rawPoint.isOffset && (
          <span className="offset-pulse bg-orange-200 text-orange-700 text-xs px-2 py-0.5 rounded font-medium">
            坐标偏移 {formatDistance(rawPoint.offsetDistance)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">原始坐标</div>
          <div className="font-mono-data text-sm">
            <div>纬度: {rawPoint.rawLat.toFixed(6)}</div>
            <div>经度: {rawPoint.rawLng.toFixed(6)}</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">规范坐标</div>
          <div className="font-mono-data text-sm text-emerald-600">
            <div>纬度: {canonicalLat.toFixed(6)}</div>
            <div>经度: {canonicalLng.toFixed(6)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-gray-500 mb-1">坐标偏差</div>
          <div className={`font-mono-data ${rawPoint.isOffset ? 'text-orange-600' : 'text-gray-600'}`}>
            Δ纬度: {latDiff >= 0 ? '+' : ''}{latDiff.toFixed(6)}
            <br />
            Δ经度: {lngDiff >= 0 ? '+' : ''}{lngDiff.toFixed(6)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">影响范围</div>
          <div className="font-mono-data text-gray-600">
            半径 {influenceRadius} 米
            <br />
            <span className={rawPoint.isOffset ? 'text-orange-600' : ''}>
              {rawPoint.isOffset ? '超出范围' : '在范围内'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-gray-500 mb-2">影响范围可视化</div>
        <div className="relative h-32 bg-white rounded border border-gray-200 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <circle
              cx="100"
              cy="50"
              r={Math.min(80, influenceRadius * 0.8)}
              fill="rgba(30, 58, 95, 0.1)"
              stroke="rgba(30, 58, 95, 1)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <circle
              cx="100"
              cy="50"
              r="4"
              fill="#1e3a5f"
            />
            <circle
              cx={100 + lngDiff * 1000}
              cy={50 - latDiff * 1000}
              r="4"
              fill={rawPoint.isOffset ? '#f97316' : '#10b981'}
            />
            <line
              x1="100"
              y1="50"
              x2={100 + lngDiff * 1000}
              y2={50 - latDiff * 1000}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          </svg>
          <div className="absolute bottom-2 left-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-city-blue-600"></span>
              <span>规范位置</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${rawPoint.isOffset ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
              <span>原始位置</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-0 border border-city-blue-600 border-dashed"></span>
              <span>影响范围</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
