const SceneLighting = () => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 50, 50]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[25, 20, 0]} intensity={0.5} color="#4a90d9" />
      <pointLight position={[0, 20, 0]} intensity={0.3} color="#4a90d9" />
      <pointLight position={[50, 20, 0]} intensity={0.3} color="#4a90d9" />
    </>
  );
};

export default SceneLighting;
