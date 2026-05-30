const FloorGrid = () => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[25, -1, 0]} receiveShadow>
        <planeGeometry args={[100, 60]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      
      <gridHelper
        args={[100, 20, '#1e3a5f', '#1e293b']}
        position={[25, -0.9, 0]}
      />
      
      <mesh position={[25, -0.8, 28]}>
        <boxGeometry args={[0.5, 0.1, 3]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[53, -0.8, 0]}>
        <boxGeometry args={[3, 0.1, 0.5]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
};

export default FloorGrid;
