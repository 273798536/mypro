import React, { useMemo } from 'react';
import { TrackPoint, MapBounds, SourceMaterial } from '../../types';
import { lngLatToScreen } from '../../utils/geoCalculation';

interface TrackLayerProps {
  points: TrackPoint[];
  bounds: MapBounds;
  width: number;
  height: number;
  selectedPointId: string | null;
  onPointClick: (point: TrackPoint) => void;
  showSnapped: boolean;
  materials: SourceMaterial[];
}

const TrackLayer: React.FC<TrackLayerProps> = ({
  points,
  bounds,
  width,
  height,
  selectedPointId,
  onPointClick,
  showSnapped,
  materials
}) => {
  const visiblePoints = useMemo(() => {
    return points.map(point => {
      const lng = showSnapped && point.snappedLng !== undefined
        ? point.snappedLng
        : point.originalLng;
      const lat = showSnapped && point.snappedLat !== undefined
        ? point.snappedLat
        : point.originalLat;
      
      const { x, y } = lngLatToScreen(lng, lat, bounds, width, height);
      
      const mat = materials.find(m => m.id === point.sourceMaterial);
      
      return {
        ...point,
        x,
        y,
        materialName: mat?.name || '未知材料'
      };
    });
  }, [points, bounds, width, height, showSnapped, materials]);

  const connections = useMemo(() => {
    const sorted = [...visiblePoints].sort((a, b) => a.timestamp - b.timestamp);
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const isSameMaterial = sorted[i].sourceMaterial === sorted[i + 1].sourceMaterial;
      if (isSameMaterial) {
        lines.push({
          x1: sorted[i].x,
          y1: sorted[i].y,
          x2: sorted[i + 1].x,
          y2: sorted[i + 1].y
        });
      }
    }
    return lines;
  }, [visiblePoints]);

  const getPointClass = (point: TrackPoint): string => {
    if (point.status === 'out-of-bounds') return 'track-point out-of-bounds';
    if (point.status === 'color-invalid') return 'track-point color-invalid';
    if (point.status === 'missing-unit') return 'track-point missing-unit';
    if (point.status === 'supplementary') return 'track-point supplementary';
    return 'track-point normal';
  };

  return (
    <g className="track-layer">
      {connections.map((conn, i) => (
        <line
          key={`conn-${i}`}
          x1={conn.x1}
          y1={conn.y1}
          x2={conn.x2}
          y2={conn.y2}
          className="track-connection"
        />
      ))}
      
      {visiblePoints.map(point => (
        <g
          key={point.id}
          onClick={() => onPointClick(point)}
          style={{ cursor: 'pointer' }}
        >
          {point.status === 'out-of-bounds' && (
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="none"
              stroke="var(--color-cinnabar)"
              strokeWidth="2"
              className="cinnabar-pulse"
            />
          )}
          
          <circle
            cx={point.x}
            cy={point.y}
            r={selectedPointId === point.id ? 7 : 5}
            className={getPointClass(point)}
            stroke={selectedPointId === point.id ? '#1a1a1a' : 'none'}
            strokeWidth={selectedPointId === point.id ? 2 : 0}
          />
          
          {selectedPointId === point.id && (
            <g>
              <rect
                x={point.x + 10}
                y={point.y - 40}
                width="200"
                height="75"
                rx="4"
                fill="var(--color-xuan-50)"
                stroke="var(--color-ochre-400)"
                strokeWidth="1"
              />
              <text
                x={point.x + 18}
                y={point.y - 24}
                fontSize="11"
                fill="var(--color-ink-600)"
                fontFamily="Noto Serif SC, serif"
              >
                点号：{point.id.slice(-8)}
              </text>
              <text
                x={point.x + 18}
                y={point.y - 8}
                fontSize="11"
                fill="var(--color-ink-600)"
                fontFamily="Noto Serif SC, serif"
              >
                坐标：{point.originalLng.toFixed(6)}, {point.originalLat.toFixed(6)}
              </text>
              <text
                x={point.x + 18}
                y={point.y + 8}
                fontSize="11"
                fill="var(--color-ochre-600)"
                fontFamily="Noto Serif SC, serif"
              >
                材料：{point.materialName}
              </text>
              <text
                x={point.x + 18}
                y={point.y + 24}
                fontSize="11"
                fill={point.status === 'normal' ? 'var(--color-azure-600)' : 'var(--color-cinnabar)'}
                fontFamily="Noto Serif SC, serif"
              >
                状态：{point.status === 'normal' ? '正常' : point.status === 'out-of-bounds' ? '边界越界' : point.status === 'color-invalid' ? '颜色异常' : point.status === 'missing-unit' ? '缺项漏填' : '补录数据'}
              </text>
            </g>
          )}
        </g>
      ))}
    </g>
  );
};

export default TrackLayer;
