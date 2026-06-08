import { useMemo } from 'react';
import { useReactorStore } from '@/store/useReactorStore';

const PLANE_SIZE = 6;
const TICK_COUNT = 6;

function TickMarks({ direction, offset }: { direction: 'x' | 'y' | 'z'; offset: number }) {
  const ticks = useMemo(() => {
    const result: JSX.Element[] = [];
    const half = PLANE_SIZE / 2;
    for (let i = 0; i <= TICK_COUNT; i++) {
      const t = -half + (i * PLANE_SIZE) / TICK_COUNT;
      const isMajor = i % 2 === 0;
      const tickLen = isMajor ? 0.15 : 0.08;
      result.push(
        <lineSegments key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={
                direction === 'x'
                  ? new Float32Array([offset, t - tickLen, -half, offset, t + tickLen, -half])
                  : direction === 'y'
                  ? new Float32Array([t - tickLen, offset, -half, t + tickLen, offset, -half])
                  : new Float32Array([t - tickLen, -half, offset, t + tickLen, -half, offset])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#5DD3E8" transparent opacity={0.5} />
        </lineSegments>
      );
    }
    return result;
  }, [direction, offset]);
  return <>{ticks}</>;
}

export default function ClipPlaneVisuals() {
  const clipPlanes = useReactorStore((s) => s.clipPlanes);

  if (!clipPlanes.enabled) return null;

  return (
    <group>
      <group position={[clipPlanes.x, 0, 0]}>
        <mesh>
          <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
          <meshBasicMaterial
            color="#5DD3E8"
            transparent
            opacity={0.08}
            side={2}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry>
            <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
          </edgesGeometry>
          <lineBasicMaterial color="#5DD3E8" transparent opacity={0.7} />
        </lineSegments>
        <TickMarks direction="x" offset={0} />
      </group>

      <group position={[0, clipPlanes.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
          <meshBasicMaterial
            color="#5DD3E8"
            transparent
            opacity={0.08}
            side={2}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry>
            <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
          </edgesGeometry>
          <lineBasicMaterial color="#5DD3E8" transparent opacity={0.7} />
        </lineSegments>
        <TickMarks direction="y" offset={0} />
      </group>

      <group position={[0, 0, clipPlanes.z]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
          <meshBasicMaterial
            color="#5DD3E8"
            transparent
            opacity={0.08}
            side={2}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry>
            <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
          </edgesGeometry>
          <lineBasicMaterial color="#5DD3E8" transparent opacity={0.7} />
        </lineSegments>
        <TickMarks direction="z" offset={0} />
      </group>
    </group>
  );
}
