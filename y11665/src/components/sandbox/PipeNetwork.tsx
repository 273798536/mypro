import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PipeSegment, PipeNode } from '@/types';
import { getPressureColor } from '@/hooks/usePressureCalc';
import { useWaterStore } from '@/store/useWaterStore';

interface PipeNetworkProps {
  segments: PipeSegment[];
  nodes: PipeNode[];
}

const nodePositions: Record<string, [number, number, number]> = {
  'N01': [0, 0, 0], 'N02': [5, 0, 0], 'N03': [10, 0, 0],
  'N04': [10, 0, 5], 'N05': [5, 0, 5], 'N06': [0, 0, 5],
  'N07': [15, 0, 2.5], 'N08': [10, 0, -3], 'N09': [0, 0, -3],
  'N10': [5, 0, 10], 'N11': [15, 0, -3], 'N12': [-3, 0, 2.5],
};

export default function PipeNetwork({ segments, nodes }: PipeNetworkProps) {
  const {
    selectedSegmentId,
    hoveredSegmentId,
    pressureThreshold,
    selectSegment,
    setHoveredSegment,
    filterDataQuality,
  } = useWaterStore();

  const filteredSegments = useMemo(
    () => segments.filter(s => filterDataQuality.includes(s.dataQuality)),
    [segments, filterDataQuality]
  );

  const pipeMaterials = useMemo(() => {
    return filteredSegments.map(segment => {
      const color = getPressureColor(segment.currentPressure, pressureThreshold, segment.dataQuality);
      return { segment, color };
    });
  }, [filteredSegments, pressureThreshold]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PipeNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <group>
      {pipeMaterials.map(({ segment, color }) => {
        const fromPos = nodePositions[segment.fromNode];
        const toPos = nodePositions[segment.toNode];
        if (!fromPos || !toPos) return null;

        const isSelected = selectedSegmentId === segment.id;
        const isHovered = hoveredSegmentId === segment.id;
        const lineWidth = isSelected ? 3 : isHovered ? 2.5 : 1.5;

        return (
          <group key={segment.id}>
            <Line
              points={[
                new THREE.Vector3(...fromPos),
                new THREE.Vector3(...toPos),
              ]}
              color={color}
              lineWidth={lineWidth}
              transparent
              opacity={segment.dataQuality === 'bad' ? 0.4 : 1}
              dashed={segment.dataQuality === 'bad'}
              dashScale={30}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredSegment(segment.id);
              }}
              onPointerOut={() => setHoveredSegment(null)}
              onClick={(e) => {
                e.stopPropagation();
                selectSegment(segment.id);
              }}
            />
            {(isSelected || isHovered) && (
              <Html
                position={[
                  (fromPos[0] + toPos[0]) / 2,
                  1.5,
                  (fromPos[2] + toPos[2]) / 2,
                ]}
                center
                distanceFactor={15}
              >
                <div
                  style={{
                    background: 'rgba(14, 42, 71, 0.95)',
                    border: `1px solid ${color}`,
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#fff',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    boxShadow: `0 0 12px ${color}`,
                  }}
                >
                  <div style={{ fontWeight: 600, color }}>{segment.id}</div>
                  <div style={{ fontFamily: 'monospace' }}>
                    {segment.currentPressure.toFixed(2)} MPa
                  </div>
                  <div style={{ fontSize: '9px', opacity: 0.7 }}>
                    {segment.material} | DN{segment.diameter}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {nodes.map(node => {
        const pos = nodePositions[node.id];
        if (!pos) return null;
        return (
          <mesh key={node.id} position={pos}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
