import { useRef, useMemo } from "react";
import * as THREE from "three";

export default function GridFloor() {
  const gridRef = useRef<THREE.Group>(null);

  const gridLines = useMemo(() => {
    const lines: { start: [number, number, number]; end: [number, number, number] }[] = [];
    for (let i = -8; i <= 8; i++) {
      lines.push({ start: [i, -0.01, -8], end: [i, -0.01, 8] });
      lines.push({ start: [-8, -0.01, i], end: [8, -0.01, i] });
    }
    return lines;
  }, []);

  return (
    <group ref={gridRef}>
      {gridLines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...line.start, ...line.end])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#1a3a5c" transparent opacity={0.3} />
        </line>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshBasicMaterial color="#060d1f" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
