import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStabilityStore } from '@/store/useStabilityStore';
import { useShipStore } from '@/store/useShipStore';
import { DataLabel } from '@/components/common/DataLabel';
import { ArrowDown, Navigation, AlertTriangle } from 'lucide-react';

export const StabilityAnnotations: React.FC = () => {
  const result = useStabilityStore((state) => state.result);
  const showAnnotations = useStabilityStore((state) => state.showAnnotations);
  const ship = useShipStore((state) => state.currentShip);

  const annotations = useMemo(() => {
    if (!result) return [];

    const items: Array<{
      position: [number, number, number];
      content: React.ReactNode;
      type: 'point' | 'arrow' | 'line';
      endPosition?: [number, number, number];
      color: string;
    }> = [];

    items.push({
      position: [result.centerOfGravity.x, result.centerOfGravity.z, result.centerOfGravity.y],
      endPosition: [result.centerOfGravity.x, result.centerOfGravity.z - 3, result.centerOfGravity.y],
      type: 'arrow',
      color: '#EF4444',
      content: (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-red-400 text-xs font-bold">
            <ArrowDown size={12} />
            <span>重心 G</span>
          </div>
          <div className="flex gap-1">
            <DataLabel value={result.centerOfGravity.x.toFixed(1)} unit="m" label="X" />
            <DataLabel value={result.centerOfGravity.y.toFixed(1)} unit="m" label="Y" />
            <DataLabel value={result.centerOfGravity.z.toFixed(1)} unit="m" label="Z" />
          </div>
        </div>
      ),
    });

    items.push({
      position: [result.centerOfBuoyancy.x, result.centerOfBuoyancy.z, result.centerOfBuoyancy.y],
      endPosition: [result.centerOfBuoyancy.x, result.centerOfBuoyancy.z + 3, result.centerOfBuoyancy.y],
      type: 'arrow',
      color: '#3B82F6',
      content: (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-blue-400 text-xs font-bold">
            <Navigation size={12} />
            <span>浮心 B</span>
          </div>
          <div className="flex gap-1">
            <DataLabel value={result.centerOfBuoyancy.x.toFixed(1)} unit="m" label="X" />
            <DataLabel value={result.centerOfBuoyancy.y.toFixed(1)} unit="m" label="Y" />
            <DataLabel value={result.centerOfBuoyancy.z.toFixed(1)} unit="m" label="Z" />
          </div>
        </div>
      ),
    });

    const offsetStatus = result.gravityOffset.distance > result.gravityOffset.allowable * 0.7
      ? 'danger'
      : result.gravityOffset.distance > result.gravityOffset.allowable * 0.4
      ? 'warning'
      : 'normal';

    items.push({
      position: [0, ship.depth / 2 + 2, 0],
      type: 'point',
      color: '#10B981',
      content: (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
            <span>原点 O (0,0,0)</span>
          </div>
        </div>
      ),
    });

    const offsetAngle = Math.atan2(result.centerOfGravity.y, result.centerOfGravity.x);
    const offsetX = Math.cos(offsetAngle) * 5;
    const offsetZ = Math.sin(offsetAngle) * 5;

    items.push({
      position: [0, result.centerOfGravity.z, 0],
      endPosition: [result.centerOfGravity.x, result.centerOfGravity.z, result.centerOfGravity.y],
      type: 'line',
      color: offsetStatus === 'danger' ? '#EF4444' : offsetStatus === 'warning' ? '#F59E0B' : '#10B981',
      content: (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: offsetStatus === 'danger' ? '#EF4444' : offsetStatus === 'warning' ? '#F59E0B' : '#10B981' }}>
            {offsetStatus !== 'normal' && <AlertTriangle size={12} />}
            <span>重心偏移</span>
          </div>
          <div className="flex gap-1">
            <DataLabel
              value={result.gravityOffset.distance.toFixed(2)}
              unit="m"
              label="偏移量"
              status={offsetStatus}
            />
            <DataLabel
              value={result.gravityOffset.allowable.toFixed(2)}
              unit="m"
              label="允许值"
            />
          </div>
          <span className="text-xs text-slate-400">方向: {result.gravityOffset.direction}</span>
        </div>
      ),
    });

    return items;
  }, [result, ship]);

  if (!showAnnotations || !result) return null;

  return (
    <group>
      <lineSegments>
        <axesHelper args={[10]} />
      </lineSegments>

      {annotations.map((ann, i) => (
        <group key={i}>
          {ann.type === 'arrow' && ann.endPosition && (
            <arrowHelper
              args={[
                new THREE.Vector3(
                  ann.endPosition[0] - ann.position[0],
                  ann.endPosition[1] - ann.position[1],
                  ann.endPosition[2] - ann.position[2]
                ).normalize(),
                new THREE.Vector3(...ann.position),
                3,
                new THREE.Color(ann.color).getHex(),
              ]}
            />
          )}

          {ann.type === 'line' && ann.endPosition && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    ann.position[0], ann.position[1], ann.position[2],
                    ann.endPosition[0], ann.endPosition[1], ann.endPosition[2],
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineDashedMaterial color={ann.color} linewidth={2} dashSize={0.5} gapSize={0.3} />
            </line>
          )}

          {ann.type === 'point' && (
            <mesh position={ann.position}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshBasicMaterial color={ann.color} />
            </mesh>
          )}

          <Html
            position={[ann.position[0], ann.position[1] + 1.5, ann.position[2]]}
            center
            distanceFactor={12}
            zIndexRange={[100, 0]}
          >
            {ann.content}
          </Html>
        </group>
      ))}

      <mesh position={[0, -ship.depth / 2 - 0.05, 0]}>
        <planeGeometry args={[ship.length + 20, ship.width + 20]} />
        <meshStandardMaterial
          color="#0A1628"
          transparent
          opacity={0.8}
        />
      </mesh>

      <gridHelper args={[ship.length + 20, 20, '#1E3A5F', '#0F172A']} position={[0, -ship.depth / 2, 0]} />
    </group>
  );
};
