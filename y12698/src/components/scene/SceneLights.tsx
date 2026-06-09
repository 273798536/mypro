export default function SceneLights() {
  return (
    <>
      <ambientLight color="#0A1628" intensity={0.35} />
      <directionalLight
        position={[0, 80, 30]}
        color="#88aacc"
        intensity={0.35}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-60, 40, -40]} color="#334466" intensity={0.15} />
      <hemisphereLight color="#1a2a44" groundColor="#050a12" intensity={0.25} />
      <pointLight position={[0, 10, 0]} color="#FFD93D" intensity={0.3} distance={80} />
    </>
  );
}
