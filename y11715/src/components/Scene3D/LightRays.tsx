import React from 'react';
import { Line } from '@react-three/drei';
import { RaySegment } from '../../types';

interface LightRaysProps {
  rays: RaySegment[][];
}

const RayLine: React.FC<{ start: [number, number, number]; end: [number, number, number]; isVirtual?: boolean }> = ({
  start,
  end,
  isVirtual = false,
}) => {
  return (
    <Line
      points={[start, end]}
      color={isVirtual ? '#f97316' : '#fbbf24'}
      transparent
      opacity={isVirtual ? 0.6 : 0.9}
      lineWidth={2}
      dashed={isVirtual}
      dashSize={0.3}
      gapSize={0.2}
    />
  );
};

export const LightRays: React.FC<LightRaysProps> = ({ rays }) => {
  return (
    <group>
      {rays.map((rayPath, rayIndex) =>
        rayPath.map((segment, segIndex) => (
          <RayLine
            key={`${rayIndex}-${segIndex}`}
            start={segment.start}
            end={segment.end}
            isVirtual={segment.isVirtual}
          />
        ))
      )}
    </group>
  );
};
