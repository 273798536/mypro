import { useMemo } from 'react';
import * as THREE from 'three';

export function LockModel() {
  const concreteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5a6470',
        roughness: 0.85,
        metalness: 0.08,
      }),
    []
  );

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a95a5',
        roughness: 0.35,
        metalness: 0.75,
      }),
    []
  );

  const gateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4a5568',
        roughness: 0.4,
        metalness: 0.85,
      }),
    []
  );

  const walkwayMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3d4550',
        roughness: 0.95,
        metalness: 0.05,
      }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* 基础底板 */}
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow material={concreteMat}>
        <boxGeometry args={[22, 1, 14]} />
      </mesh>

      {/* 左侧墙 */}
      <mesh position={[-5.5, 4, 0]} castShadow receiveShadow material={concreteMat}>
        <boxGeometry args={[1, 9, 12]} />
      </mesh>
      {/* 右侧墙 */}
      <mesh position={[5.5, 4, 0]} castShadow receiveShadow material={concreteMat}>
        <boxGeometry args={[1, 9, 12]} />
      </mesh>

      {/* 上游端墙 */}
      <mesh position={[0, 4, -6]} castShadow receiveShadow material={concreteMat}>
        <boxGeometry args={[12, 9, 1]} />
      </mesh>
      {/* 下游端墙 */}
      <mesh position={[0, 4, 6]} castShadow receiveShadow material={concreteMat}>
        <boxGeometry args={[12, 9, 1]} />
      </mesh>

      {/* 闸室底部加厚 */}
      <mesh position={[0, 0.05, 0]} receiveShadow material={concreteMat}>
        <boxGeometry args={[10, 0.2, 10]} />
      </mesh>

      {/* 上游闸门 */}
      <group position={[0, 4, -5.8]}>
        <mesh castShadow receiveShadow material={gateMat}>
          <boxGeometry args={[9.5, 8, 0.6]} />
        </mesh>
        {/* 闸门加强筋 */}
        {[-3, 0, 3].map((x) => (
          <mesh key={`rib-up-${x}`} position={[x, 0, 0.35]} material={metalMat}>
            <boxGeometry args={[0.2, 7.5, 0.3]} />
          </mesh>
        ))}
      </group>

      {/* 下游闸门 */}
      <group position={[0, 4, 5.8]}>
        <mesh castShadow receiveShadow material={gateMat}>
          <boxGeometry args={[9.5, 8, 0.6]} />
        </mesh>
        {[-3, 0, 3].map((x) => (
          <mesh key={`rib-dn-${x}`} position={[x, 0, -0.35]} material={metalMat}>
            <boxGeometry args={[0.2, 7.5, 0.3]} />
          </mesh>
        ))}
      </group>

      {/* 顶部工作桥 */}
      <mesh position={[0, 9.2, 0]} castShadow material={walkwayMat}>
        <boxGeometry args={[14, 0.6, 13]} />
      </mesh>
      {/* 桥栏杆 */}
      {[-6.8, 6.8].map((x) => (
        <mesh key={`rail-x-${x}`} position={[x, 9.9, 0]} material={metalMat}>
          <boxGeometry args={[0.1, 0.8, 12.5]} />
        </mesh>
      ))}
      {[-6, 6].map((z) => (
        <mesh key={`rail-z-${z}`} position={[0, 9.9, z]} material={metalMat}>
          <boxGeometry args={[13.5, 0.8, 0.1]} />
        </mesh>
      ))}

      {/* 两侧塔架 */}
      {[-6.5, 6.5].map((x) =>
        [-4.5, 4.5].map((z) => (
          <group key={`tower-${x}-${z}`} position={[x, 6, z]}>
            <mesh castShadow material={concreteMat}>
              <boxGeometry args={[0.8, 6, 0.8]} />
            </mesh>
            <mesh position={[0, 3.3, 0]} castShadow material={metalMat}>
              <boxGeometry args={[1, 0.4, 1]} />
            </mesh>
          </group>
        ))
      )}

      {/* 输水廊道标识 */}
      <mesh position={[-3, 0.8, 0]} material={metalMat}>
        <cylinderGeometry args={[0.4, 0.4, 2, 16]} />
      </mesh>
      <mesh position={[3, 0.8, 0]} material={metalMat}>
        <cylinderGeometry args={[0.4, 0.4, 2, 16]} />
      </mesh>

      {/* 上游连接段（缩短示意） */}
      <mesh position={[-10, 1.5, 0]} receiveShadow material={concreteMat}>
        <boxGeometry args={[4, 4, 12]} />
      </mesh>
      {/* 下游连接段 */}
      <mesh position={[10, 1.5, 0]} receiveShadow material={concreteMat}>
        <boxGeometry args={[4, 4, 12]} />
      </mesh>

      {/* 水位刻度标尺 */}
      {[-5.2, 5.2].map((x) => (
        <group key={`scale-${x}`} position={[x, 4.5, 5.6]}>
          {Array.from({ length: 15 }).map((_, i) => (
            <mesh key={i} position={[0, -4 + i * 0.6, 0]} material={metalMat}>
              <boxGeometry args={[0.08, 0.02, 0.3]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
