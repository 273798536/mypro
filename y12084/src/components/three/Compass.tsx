import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';

export default function Compass() {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;

    const cameraDir = camera.getWorldDirection(new (require('three').Vector3)());
    const angle = Math.atan2(cameraDir.x, cameraDir.z);

    groupRef.current.rotation.y = -angle;
  });

  const directions = [
    { label: 'N', angle: 0, color: '#ff4757' },
    { label: 'E', angle: Math.PI / 2, color: '#ffffff' },
    { label: 'S', angle: Math.PI, color: '#ffffff' },
    { label: 'W', angle: Math.PI * 1.5, color: '#ffffff' }
  ];

  return (
    <group position={[80, 5, 80]}>
      <group ref={groupRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
          <circleGeometry args={[8, 64]} />
          <meshBasicMaterial color="#0a1628" transparent opacity={0.9} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.51, 0]}>
          <ringGeometry args={[6, 7.5, 64]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} />
        </mesh>

        {directions.map((dir, index) => {
          const x = Math.sin(dir.angle) * 5;
          const z = Math.cos(dir.angle) * 5;
          return (
            <group key={index} position={[x, 0.6, z]}>
              <Html center distanceFactor={10}>
                <div
                  className="font-bold text-sm select-none"
                  style={{
                    color: dir.color,
                    fontFamily: '"JetBrains Mono", monospace',
                    textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                  }}
                >
                  {dir.label}
                </div>
              </Html>
            </group>
          );
        })}

        <mesh position={[0, 1, 0]}>
          <coneGeometry args={[0.8, 2.5, 4]} />
          <meshBasicMaterial color="#ff4757" />
        </mesh>

        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#ff4757" />
        </mesh>
      </group>

      <Html position={[0, -1, 0]} center distanceFactor={15}>
        <div className="text-xs text-cyan-400/80 whitespace-nowrap select-none" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          比例尺 1:500
        </div>
      </Html>
    </group>
  );
}
