import { useState, useCallback, useMemo } from 'react';
import type { LocationPoint, SceneAnnotation, SitePhoto } from '../types';

const riskColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

interface AnnotationMapProps {
  center: { lat: number; lng: number };
  annotations: SceneAnnotation[];
  photos: SitePhoto[];
  onAddAnnotation?: (loc: LocationPoint) => void;
  selectedAnnotationId?: string | null;
  onSelectAnnotation?: (id: string | null) => void;
}

const MAP_WIDTH = 700;
const MAP_HEIGHT = 360;

function latLngToXY(lat: number, lng: number, center: { lat: number; lng: number }) {
  const scale = 50000;
  const x = MAP_WIDTH / 2 + (lng - center.lng) * scale;
  const y = MAP_HEIGHT / 2 - (lat - center.lat) * scale;
  return { x: Math.max(20, Math.min(MAP_WIDTH - 20, x)), y: Math.max(20, Math.min(MAP_HEIGHT - 20, y)) };
}

export function AnnotationMap({
  center,
  annotations,
  photos,
  onAddAnnotation,
  selectedAnnotationId: _selectedAnnotationId,
  onSelectAnnotation,
}: AnnotationMapProps) {
  const [photoPopup, setPhotoPopup] = useState<SitePhoto | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onAddAnnotation) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const lng = center.lng + (x - MAP_WIDTH / 2) / 50000;
      const lat = center.lat - (y - MAP_HEIGHT / 2) / 50000;
      onAddAnnotation({
        lat,
        lng,
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    },
    [center, onAddAnnotation],
  );

  const streetLines = useMemo(() => {
    return [
      { x1: 50, y1: 80, x2: 650, y2: 80, name: '正街' },
      { x1: 50, y1: 200, x2: 650, y2: 200, name: '后街' },
      { x1: 120, y1: 40, x2: 120, y2: 320, name: '东街' },
      { x1: 350, y1: 40, x2: 350, y2: 320, name: '中街' },
      { x1: 580, y1: 40, x2: 580, y2: 320, name: '西街' },
    ];
  }, []);

  const landmarkPoints = useMemo(() => [
    { x: 120, y: 140, label: '老街口', icon: '🚪' },
    { x: 350, y: 140, label: '老槐树', icon: '🌳' },
    { x: 580, y: 140, label: '居委会', icon: '🏛️' },
    { x: 350, y: 260, label: '消防栓', icon: '🔴' },
  ], []);

  return (
    <div className="map-wrapper">
      <svg
        width="100%"
        height={MAP_HEIGHT}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        onClick={handleMapClick}
        style={{
          background: '#f8fafc',
          borderRadius: '8px',
          cursor: onAddAnnotation ? 'crosshair' : 'default',
        }}
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {streetLines.map((line, idx) => (
          <g key={idx}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#cbd5e1"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <text
              x={(line.x1 + line.x2) / 2}
              y={(line.y1 + line.y2) / 2 - 10}
              textAnchor="middle"
              fill="#64748b"
              fontSize="11"
            >
              {line.name}
            </text>
          </g>
        ))}

        {landmarkPoints.map((pt, idx) => (
          <g key={idx} transform={`translate(${pt.x}, ${pt.y})`}>
            <circle r="18" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="16">
              {pt.icon}
            </text>
            <text y="28" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="500">
              {pt.label}
            </text>
          </g>
        ))}

        {annotations.map(a => {
          const pos = latLngToXY(a.location.lat, a.location.lng, center);
          const color = riskColors[a.riskLevel];
          const isHovered = hoveredId === a.id;
          const annPhotos = photos.filter(p => p.annotationId === a.id);

          return (
            <g
              key={a.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={e => {
                e.stopPropagation();
                onSelectAnnotation && onSelectAnnotation(a.id);
              }}
              onMouseEnter={() => setHoveredId(a.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                r={isHovered ? 14 : 12}
                fill={color}
                stroke="#fff"
                strokeWidth="3"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  transition: 'r 0.15s ease',
                }}
              />
              {isHovered && (
                <g transform="translate(0, -40)">
                  <rect
                    x="-100"
                    y="-30"
                    width="200"
                    height="60"
                    rx="6"
                    fill="#fff"
                    stroke={color}
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                  />
                  <text
                    textAnchor="middle"
                    y="-12"
                    fill="#1e293b"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {a.category}
                  </text>
                  <text
                    textAnchor="middle"
                    y="6"
                    fill="#64748b"
                    fontSize="10"
                  >
                    {a.location.address}
                  </text>
                  <text
                    textAnchor="middle"
                    y="22"
                    fill="#475569"
                    fontSize="10"
                  >
                    风险：{a.riskLevel === 'low' ? '低' : a.riskLevel === 'medium' ? '中' : '高'}
                    {annPhotos.length > 0 && ` | 照片${annPhotos.length}张`}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {onAddAnnotation && (
          <text x={MAP_WIDTH / 2} y={MAP_HEIGHT - 15} textAnchor="middle" fill="#94a3b8" fontSize="11">
            💡 点击地图添加新的场景标注
          </text>
        )}
      </svg>

      {photoPopup && (
        <div className="photo-modal" onClick={() => setPhotoPopup(null)}>
          <div className="photo-modal-content" onClick={e => e.stopPropagation()}>
            <img src={photoPopup.dataUrl} alt={photoPopup.caption} />
            <div className="photo-caption">{photoPopup.caption}</div>
            <button className="btn btn-secondary" onClick={() => setPhotoPopup(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
