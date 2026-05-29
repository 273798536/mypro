import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@/store/useSceneStore';
import { useDataStore } from '@/store/useDataStore';
import { useAcousticCalc } from '@/hooks/useAcousticCalc';

const getMeshColor = (meshName: string, hasMaterial: boolean): string => {
  if (!hasMaterial) return '#FFB800';

  if (meshName.includes('floor')) return '#4a3728';
  if (meshName.includes('ceiling')) return '#374151';
  if (meshName.includes('wall')) return '#1f2937';
  if (meshName.includes('stage')) return '#5c4033';
  if (meshName.includes('balcony')) return '#3f3f46';
  if (meshName.includes('panel')) return '#065f46';

  return '#374151';
};

export const HallModel = () => {
  const { showHall, showWireframe, hallOpacity } = useSceneStore();
  const { hallModel, getMaterialById } = useDataStore();
  const { getHallGeometries } = useAcousticCalc();
  const groupRef = useRef<THREE.Group>(null);

  const geometries = useMemo(() => {
    if (!hallModel) return {};
    return getHallGeometries();
  }, [hallModel, getHallGeometries]);

  if (!hallModel || !showHall) return null;

  const batchColors = {
    1: { border: '#4D96FF', opacity: 1 },
    2: { border: '#4ECDC4', opacity: 0.9 },
    3: { border: '#FF4D6D', opacity: 0.85 },
  };

  const batchColor = batchColors[hallModel.importMeta.batch as keyof typeof batchColors] || batchColors[1];

  return (
    <group ref={groupRef}>
      {Object.entries(geometries).map(([name, geometry]) => {
        const assignment = hallModel.materials.find((m) => m.meshName === name);
        const hasMaterial = assignment?.materialId !== null;
        const material = getMaterialById(assignment?.materialId || null);
        const color = getMeshColor(name, hasMaterial);

        const opacity = hasMaterial ? hallOpacity : Math.min(hallOpacity, 0.5);
        const emissive = !hasMaterial ? '#FFB800' : '#000000';
        const emissiveIntensity = !hasMaterial ? 0.15 : 0;

        return (
          <group key={name} name={name}>
            <mesh geometry={geometry} castShadow receiveShadow>
              <meshStandardMaterial
                color={color}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
                wireframe={showWireframe}
                roughness={0.7}
                metalness={0.1}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
              />
            </mesh>

            {!hasMaterial && (
              <mesh geometry={geometry}>
                <meshBasicMaterial
                  color="#FFB800"
                  wireframe
                  transparent
                  opacity={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            <mesh geometry={geometry}>
              <meshBasicMaterial
                color={batchColor.border}
                wireframe
                transparent
                opacity={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}

      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 1.2, 32]} />
        <meshBasicMaterial color={batchColor.border} transparent opacity={0.6} />
      </mesh>
    </group>
  );
};
