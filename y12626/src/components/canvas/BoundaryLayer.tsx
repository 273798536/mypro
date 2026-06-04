import React, { useMemo } from 'react';
import { Boundary, MapBounds } from '../../types';
import { lngLatToScreen } from '../../utils/geoCalculation';

interface BoundaryLayerProps {
  boundaries: Boundary[];
  bounds: MapBounds;
  width: number;
  height: number;
}

const BoundaryLayer: React.FC<BoundaryLayerProps> = ({ boundaries, bounds, width, height }) => {
  const paths = useMemo(() => {
    return boundaries.map(boundary => {
      const points = boundary.coordinates.map(([lng, lat]) => {
        const { x, y } = lngLatToScreen(lng, lat, bounds, width, height);
        return `${x},${y}`;
      }).join(' ');

      const centerLng = boundary.coordinates.reduce((sum, [lng]) => sum + lng, 0) / boundary.coordinates.length;
      const centerLat = boundary.coordinates.reduce((sum, [, lat]) => sum + lat, 0) / boundary.coordinates.length;
      const center = lngLatToScreen(centerLng, centerLat, bounds, width, height);

      return {
        id: boundary.id,
        path: `M ${points} Z`,
        type: boundary.type,
        name: boundary.name,
        center
      };
    });
  }, [boundaries, bounds, width, height]);

  return (
    <g className="boundary-layer">
      {paths.map(path => (
        <g key={path.id}>
          <path
            d={path.path}
            className={`boundary-${path.type}`}
          />
          <text
            x={path.center.x}
            y={path.center.y}
            fontSize="11"
            fill={path.type === 'core' ? '#C41E3A' : path.type === 'buffer' ? '#8B4513' : '#4A6741'}
            fontFamily="Noto Serif SC, serif"
            textAnchor="middle"
            opacity="0.8"
          >
            {path.name}
          </text>
        </g>
      ))}
    </g>
  );
};

export default BoundaryLayer;
