export default function Lights() {
  return (
    <>
      <directionalLight
        color="#E8F0FF"
        intensity={1.2}
        position={[10, 15, 10]}
      />
      <ambientLight
        color="#1E40AF"
        intensity={0.3}
      />
      <pointLight
        color="#4488FF"
        position={[-10, 5, -10]}
        intensity={0.5}
      />
    </>
  )
}
