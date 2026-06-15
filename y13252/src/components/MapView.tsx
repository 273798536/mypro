import { useMemo } from 'react';
import { MapPin, AlertTriangle, Navigation } from 'lucide-react';
import type { Complaint, Photo } from '../../shared/types.js';
import { calculateDistance } from '../utils/geoUtils.js';

interface MapViewProps {
  complaint: Complaint;
}

export default function MapView({ complaint }: MapViewProps) {
  const mapData = useMemo(() => {
    const { latitude: centerLat, longitude: centerLon } = complaint;
    
    const allPoints = [
      { lat: centerLat, lon: centerLon, type: 'complaint' as const },
      ...complaint.photos.map(p => ({
        lat: p.latitude,
        lon: p.longitude,
        type: 'photo' as const,
        photo: p
      }))
    ];

    const lats = allPoints.map(p => p.lat);
    const lons = allPoints.map(p => p.lon);
    
    const minLat = Math.min(...lats) - 0.0005;
    const maxLat = Math.max(...lats) + 0.0005;
    const minLon = Math.min(...lons) - 0.0005;
    const maxLon = Math.max(...lons) + 0.0005;

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    
    const width = 600;
    const height = 400;

    const toX = (lon: number) => ((lon - minLon) / lonRange) * (width - 40) + 20;
    const toY = (lat: number) => height - (((lat - minLat) / latRange) * (height - 40) + 20);

    return {
      width,
      height,
      complaintPoint: { x: toX(centerLon), y: toY(centerLat) },
      photoPoints: complaint.photos.map(p => {
        const distance = calculateDistance(centerLat, centerLon, p.latitude, p.longitude);
        return {
          x: toX(p.longitude),
          y: toY(p.latitude),
          photo: p,
          distance,
          hasOffset: distance > 50
        };
      }),
      streets: [
        { x1: 10, y1: height * 0.3, x2: width - 10, y2: height * 0.3, name: '红旗路' },
        { x1: 10, y1: height * 0.7, x2: width - 10, y2: height * 0.7, name: '红星路' },
        { x1: width * 0.5, y1: 10, x2: width * 0.5, y2: height - 10, name: '解放路' }
      ]
    };
  }, [complaint]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Navigation className="w-5 h-5 text-[#1e3a5f]" />
        地图点位
      </h3>
      
      <div className="relative bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg overflow-hidden">
        <svg
          width="100%"
          viewBox={`0 0 ${mapData.width} ${mapData.height}`}
          className="block"
        >
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {mapData.streets.map((street, i) => (
            <g key={i}>
              <line
                x1={street.x1}
                y1={street.y1}
                x2={street.x2}
                y2={street.y2}
                stroke="#94a3b8"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1={street.x1}
                y1={street.y1}
                x2={street.x2}
                y2={street.y2}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="10,10"
              />
              <text
                x={street.x1 + 20}
                y={street.y1 - 8}
                fontSize="12"
                fill="#64748b"
                fontWeight="500"
              >
                {street.name}
              </text>
            </g>
          ))}
          
          {mapData.photoPoints
            .filter(p => p.hasOffset)
            .map((point, i) => (
              <g key={`line-${i}`}>
                <line
                  x1={mapData.complaintPoint.x}
                  y1={mapData.complaintPoint.y}
                  x2={point.x}
                  y2={point.y}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  className="animate-pulse-slow"
                />
                <text
                  x={(mapData.complaintPoint.x + point.x) / 2}
                  y={(mapData.complaintPoint.y + point.y) / 2 - 8}
                  fontSize="11"
                  fill="#d97706"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  偏移约{point.distance}米
                </text>
              </g>
            ))}
          
          <g className="animate-fade-in">
            <circle
              cx={mapData.complaintPoint.x}
              cy={mapData.complaintPoint.y}
              r="24"
              fill="rgba(30, 58, 95, 0.1)"
              className="animate-pulse-slow"
            />
            <circle
              cx={mapData.complaintPoint.x}
              cy={mapData.complaintPoint.y}
              r="16"
              fill="#1e3a5f"
            />
            <text
              x={mapData.complaintPoint.x}
              y={mapData.complaintPoint.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
            >
              投
            </text>
            <text
              x={mapData.complaintPoint.x}
              y={mapData.complaintPoint.y + 44}
              textAnchor="middle"
              fill="#1e3a5f"
              fontSize="11"
              fontWeight="600"
            >
              投诉点
            </text>
          </g>
          
          {mapData.photoPoints.map((point, i) => (
            <g
              key={`photo-${i}`}
              className="animate-fade-in"
              style={{ animationDelay: `${(i + 1) * 50}ms` }}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={point.hasOffset ? "14" : "12"}
                fill={point.hasOffset ? "#fef3c7" : "#dbeafe"}
                stroke={point.hasOffset ? "#f59e0b" : "#3b82f6"}
                strokeWidth="2"
                className={point.hasOffset ? "animate-pulse-slow" : ""}
              />
              <text
                x={point.x}
                y={point.y + 4}
                textAnchor="middle"
                fill={point.hasOffset ? "#92400e" : "#1e40af"}
                fontSize="10"
                fontWeight="bold"
              >
                {i + 1}
              </text>
              {point.photo.isNameMismatch && (
                <g>
                  <circle
                    cx={point.x + 10}
                    cy={point.y - 10}
                    r="8"
                    fill="#ef4444"
                  />
                  <text
                    x={point.x + 10}
                    y={point.y - 6}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
        
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg p-2 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-[#1e3a5f] flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">投</span>
            </div>
            <span className="text-slate-600">投诉点 ({complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)})</span>
          </div>
          {complaint.hasCoordinateOffset && (
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>检测到坐标偏移，最大{complaint.offsetDistance}米</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-slate-600">照片点位（正常）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-slate-600">照片点位（坐标偏移）</span>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          点位详情
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          {mapData.photoPoints.map((point, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg border text-xs ${
                point.hasOffset
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-slate-800">照片{i + 1}</span>
                <div className="flex gap-1">
                  {point.photo.isNameMismatch && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">
                      名称不一致
                    </span>
                  )}
                  {point.hasOffset && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                      偏移{point.distance}米
                    </span>
                  )}
                </div>
              </div>
              <div className="text-slate-600 space-y-0.5">
                <div>
                  <span className="text-slate-500">原始坐标：</span>
                  ({point.photo.latitude.toFixed(6)}, {point.photo.longitude.toFixed(6)})
                </div>
                <div>
                  <span className="text-slate-500">原始地址：</span>
                  {point.photo.address}
                </div>
                <div>
                  <span className="text-slate-500">数据来源：</span>
                  {point.photo.source}
                </div>
                {point.hasOffset && (
                  <div className="text-amber-700 bg-amber-100/50 px-2 py-1 rounded mt-1">
                    ⚠️ 与投诉点距离约{point.distance}米，存在跨街道偏移风险
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
