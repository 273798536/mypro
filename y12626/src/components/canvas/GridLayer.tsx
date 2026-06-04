import React, { useMemo } from 'react';
import { MapBounds } from '../../types';
import { generateGridLines } from '../../utils/coordinate';
import { lngLatToScreen } from '../../utils/geoCalculation';

interface GridLayerProps {
  bounds: MapBounds;
  width: number;
  height: number;
  gridSize: number;
  visible: boolean;
}

const GridLayer: React.FC<GridLayerProps> = ({ bounds, width, height, gridSize, visible }) => {
  const gridLines = useMemo(() => {
    if (!visible) return { vertical: [], horizontal: [] };
    return generateGridLines(bounds, gridSize);
  }, [bounds, gridSize, visible]);

  const verticalLines = useMemo(() => {
    return gridLines.vertical.map(lng => {
      const { x } = lngLatToScreen(lng, bounds.minLat, bounds, width, height);
      return { x1: x, y1: 0, x2: x, y2: height };
    });
  }, [gridLines.vertical, bounds, width, height]);

  const horizontalLines = useMemo(() => {
    return gridLines.horizontal.map(lat => {
      const { y } = lngLatToScreen(bounds.minLng, lat, bounds, width, height);
      return { x1: 0, y1: y, x2: width, y2: y };
    });
  }, [gridLines.horizontal, bounds, width, height]);

  if (!visible) return null;

  return (
    <g className="grid-layer">
      {verticalLines.map((line, i) => (
        <line
          key={`v-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className="grid-line"
        />
      ))}
      {horizontalLines.map((line, i) => (
        <line
          key={`h-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className="grid-line"
        />
      ))}
    </g>
  );
};

export default GridLayer;
