import * as THREE from 'three';

const YARD_WIDTH = 15;
const YARD_DEPTH = 12;
const BAY_COUNT = 12;
const ROW_COUNT = 8;

export function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[YARD_WIDTH * 2, YARD_DEPTH * 2]} />
        <meshStandardMaterial color="#2A3140" />
      </mesh>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[YARD_WIDTH * 1.5, YARD_DEPTH * 1.3]} />
        <meshStandardMaterial color="#343B48" />
      </mesh>
      
      {Array.from({ length: BAY_COUNT + 1 }).map((_, i) => {
        const x = (i - BAY_COUNT / 2) * 1.1 - 0.55;
        return (
          <mesh key={`bay-line-${i}`} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[ROW_COUNT * 1.3 + 0.5, 0.02]} />
            <meshBasicMaterial color="#4E5969" />
          </mesh>
        );
      })}
      
      {Array.from({ length: ROW_COUNT + 1 }).map((_, i) => {
        const z = (i - ROW_COUNT / 2) * 1.3 - 0.65;
        return (
          <mesh key={`row-line-${i}`} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[BAY_COUNT * 1.1 + 0.5, 0.02]} />
            <meshBasicMaterial color="#4E5969" />
          </mesh>
        );
      })}
      
      {Array.from({ length: BAY_COUNT }).map((_, i) => (
        <group key={`bay-label-${i}`}>
          <mesh position={[(i - 5.5) * 1.1, 0.02, -5.8]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.4]} />
            <meshBasicMaterial color="#165DFF" />
          </mesh>
        </group>
      ))}
      
      <mesh position={[0, 0, 0]}>
        <gridHelper args={[30, 30, '#4E5969', '#2A3140']} />
      </mesh>
    </group>
  );
}
