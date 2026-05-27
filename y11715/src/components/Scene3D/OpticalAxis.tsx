import React from 'react';

interface OpticalAxisProps {
  length?: number;
  focalLength: number;
}

export const OpticalAxis: React.FC<OpticalAxisProps> = ({ length = 80, focalLength }) => {
  const scale = 0.5;
  const f = focalLength * scale;

  const ticks = [];
  for (let i = -length / 2; i <= length / 2; i += 5) {
    if (i === 0) continue;
    ticks.push(
      <group key={i} position={[i * scale, 0, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshBasicMaterial color="#64748b" />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[length * scale, 0.1, 0.1]} />
        <meshBasicMaterial color="#475569" />
      </mesh>

      {ticks}

      <mesh position={[f, -0.8, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#f97316" />
      </mesh>
      <mesh position={[-f, -0.8, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#f97316" />
      </mesh>

      <group position={[f, -1.5, 0]}>
        <mesh>
          <planeGeometry args={[1.5, 0.5]} />
          <meshBasicMaterial color="#0a1628" transparent opacity={0.8} />
        </mesh>
      </group>
      <group position={[-f, -1.5, 0]}>
        <mesh>
          <planeGeometry args={[1.5, 0.5]} />
          <meshBasicMaterial color="#0a1628" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
};
