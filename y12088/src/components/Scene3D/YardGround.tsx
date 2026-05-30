import React from 'react';

interface YardGroundProps {
  width: number;
  depth: number;
}

export const YardGround: React.FC<YardGroundProps> = ({ width, depth }) => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width + 20, depth + 20]} />
        <meshStandardMaterial color="#1a1d23" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#2a2f3a" />
      </mesh>

      <gridHelper args={[width, 20, '#3a4050', '#2a2f3a']} position={[0, 0.01, 0]} />
    </group>
  );
};
