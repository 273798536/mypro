import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import { useSceneStore } from '@/store/useSceneStore';
import { useDataStore } from '@/store/useDataStore';
import { getFrequencyColor } from '@/engine/acoustics';
import { Volume2 } from 'lucide-react';

export const SoundSource = () => {
  const { showSources } = useSceneStore();
  const { soundSources } = useDataStore();
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    pulseRef.current += delta * 2;
    const pulse = Math.sin(pulseRef.current) * 0.15 + 1;

    meshRefs.current.forEach((mesh) => {
      if (mesh) {
        mesh.scale.setScalar(pulse);
      }
    });
  });

  if (!showSources || soundSources.length === 0) return null;

  return (
    <group>
      {soundSources.map((source) => {
        const color = getFrequencyColor(source.frequency);

        return (
          <group
            key={source.id}
            position={[source.position.x, source.position.y, source.position.z]}
          >
            <Billboard>
              <Html
                center
                distanceFactor={8}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      backgroundColor: color + '40',
                      border: `2px solid ${color}`,
                      boxShadow: `0 0 20px ${color}60`,
                    }}
                  >
                    <Volume2 size={14} style={{ color }} />
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      backgroundColor: color + '20',
                      color,
                      border: `1px solid ${color}40`,
                    }}
                  >
                    {source.name}
                  </span>
                </div>
              </Html>
            </Billboard>

            <mesh
              ref={(el) => {
                if (el) meshRefs.current.set(source.id, el);
              }}
            >
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>

            <mesh>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.15}
              />
            </mesh>

            <mesh>
              <ringGeometry args={[0.6, 0.65, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>

            {source.directivity === 'cardioid' && (
              <mesh rotation={[0, 0, 0]}>
                <coneGeometry args={[1.5, 3, 16, 1, true]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.05}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            <pointLight
              color={color}
              intensity={1.5}
              distance={8}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
};
