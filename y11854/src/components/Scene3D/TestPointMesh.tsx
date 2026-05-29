import { useMemo } from 'react';
import { Cone, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { calculateFieldAt } from '@/utils/fieldCalculation';

export function TestPointMesh() {
  const testPoints = useStore((s) => s.testPoints);
  const charges = useStore((s) => s.charges);
  const selectedTestPointId = useStore((s) => s.selectedTestPointId);
  const { selectTestPoint } = useStore();

  const pointData = useMemo(() => {
    return testPoints.map((tp) => {
      const field = calculateFieldAt(tp.position, charges);
      return { ...tp, field };
    });
  }, [testPoints, charges]);

  return (
    <group>
      {pointData.map((tp) => {
        const { field, position, id } = tp;
        const isSelected = id === selectedTestPointId;
        const isExplosion = !isFinite(field.magnitude) || field.magnitude > 500;

        const arrowDir = isExplosion
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(...field.vector).normalize();
        const arrowLen = isExplosion ? 0.5 : Math.min(field.magnitude * 0.3, 1.5);

        const dirE = isExplosion ? '∞' : field.magnitude.toFixed(2);

        return (
          <group key={id} position={position} onClick={(e) => {
            e.stopPropagation();
            selectTestPoint(id);
          }}>
            <Cone args={[0.08, 0.2, 8]} rotation={[Math.PI, 0, 0]}>
              <meshStandardMaterial
                color={isExplosion ? '#ff4444' : '#ffd700'}
                emissive={isExplosion ? '#ff0000' : '#ffd700'}
                emissiveIntensity={isSelected ? 0.8 : 0.4}
              />
            </Cone>

            {!isExplosion && field.magnitude > 0.01 && (
              <primitive
                object={new THREE.ArrowHelper(
                  arrowDir,
                  new THREE.Vector3(0, 0, 0),
                  arrowLen,
                  0xffd700,
                  0.1,
                  0.06
                )}
              />
            )}

            <Html position={[0, 0.4, 0]} center distanceFactor={8}>
              <div className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap
                ${isSelected ? 'bg-yellow-900/60 border border-yellow-400/50' : 'bg-black/60'}
                ${isExplosion ? 'text-red-300 border border-red-500/50' : 'text-yellow-200'}
                backdrop-blur-sm`}>
                |E|={dirE}
                {!isExplosion && (
                  <>
                    {' '}({field.vector[0].toFixed(1)}, {field.vector[1].toFixed(1)}, {field.vector[2].toFixed(1)})
                  </>
                )}
              </div>
            </Html>

            {isExplosion && (
              <Html position={[0, 0.7, 0]} center distanceFactor={8}>
                <div className="px-2 py-0.5 rounded text-[10px] font-mono text-red-300 bg-red-900/70 border border-red-500 animate-pulse">
                  ⚠ 场强爆炸
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
