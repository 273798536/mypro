export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        color="#2d5016"
        roughness={0.8}
      />
    </mesh>
  );
}

export function Grid() {
  return (
    <gridHelper args={[30, 30, '#4a5568', '#2d3748']} position={[0, -0.49, 0]} />
  );
}
