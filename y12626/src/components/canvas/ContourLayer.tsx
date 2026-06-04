import React, { useMemo } from 'react';
import { ContourData, MapBounds } from '../../types';
import { lngLatToScreen } from '../../utils/geoCalculation';

interface ContourLayerProps {
  contours: ContourData[];
  bounds: MapBounds;
  width: number;
  height: number;
}

const ContourLayer: React.FC<ContourLayerProps> = ({ contours, bounds, width, height }) => {
  const paths = useMemo(() => {
    return contours.map(contour => {
      const points = contour.coordinates.map(([lng, lat]) => {
        const { x, y } = lngLatToScreen(lng, lat, bounds, width, height);
        return `${x},${y}`;
      }).join(' ');

      return {
        id: contour.id,
        path: `M ${points}`,
        elevation: contour.elevation,
        isMajor: contour.isMajor
      };
    });
  }, [contours, bounds, width, height]);

  const labels = useMemo(() => {
    return contours
      .filter(c => c.isMajor && c.coordinates.length > 4)
      .map(contour => {
        const midIdx = Math.floor(contour.coordinates.length / 2);
        const [lng, lat] = contour.coordinates[midIdx];
        const { x, y } = lngLatToScreen(lng, lat, bounds, width, height);
        return {
          id: contour.id,
          x,
          y,
          elevation: contour.elevation
        };
      });
  }, [contours, bounds, width, height]);

  return (
    <g className="contour-layer">
      {paths.map(path => (
        <path
          key={path.id}
          d={path.path}
          className={path.isMajor ? 'contour-line-major' : 'contour-line'}
          fill="none"
        />
      ))}
      {labels.map(label => (
        <text
          key={`label-${label.id}`}
          x={label.x}
          y={label.y}
          fontSize="10"
          fill="#8B4513"
          fontFamily="Noto Serif SC, serif"
          textAnchor="middle"
          dy="-2"
          opacity="0.7"
        >
          {label.elevation}m
        </text>
      ))}
    </g>
  );
};

export default ContourLayer;
