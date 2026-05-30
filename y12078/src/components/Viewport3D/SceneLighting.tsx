export default function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#c8d6e5" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.9}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-3, 4, -4]}
        intensity={0.35}
        color="#a0c4ff"
      />
      <pointLight position={[0, 5, 0]} intensity={0.2} color="#e0e0ff" />
    </>
  )
}
