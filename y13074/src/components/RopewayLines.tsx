import { Line } from '@react-three/drei';
import * as THREE from 'three';

export default function RopewayLines() {
  const peak: [number, number, number] = [0, 8, -12];
  const a: [number, number, number] = [-8, 1.2, -4];
  const b: [number, number, number] = [0, 3.2, 0];
  const c: [number, number, number] = [8, 0.8, 4];

  const makeCurvePoints = (
    start: [number, number, number],
    end: [number, number, number]
  ): [number, number, number][] => {
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      Math.min(start[1], end[1]) - 1.5,
      (start[2] + end[2]) / 2,
    ];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end)
    );
    return curve.getPoints(40).map((p) => [p.x, p.y, p.z] as [number, number, number]);
  };

  const towerPositions: [number, number, number][] = [peak, a, b, c];

  return (
    <group>
      <Line points={makeCurvePoints(a, peak)} color="#64748b" lineWidth={1} />
      <Line points={makeCurvePoints(b, peak)} color="#64748b" lineWidth={1} />
      <Line points={makeCurvePoints(c, peak)} color="#64748b" lineWidth={1} />

      {towerPositions.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.15, 0.25, 0.5, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ))}
    </group>
  );
}
