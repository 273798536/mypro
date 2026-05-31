export function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.4} color="#e0f2fe" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.6}
        color="#93c5fd"
      />
      <pointLight
        position={[0, -5, 0]}
        intensity={0.4}
        color="#f59e0b"
      />
    </>
  );
}
