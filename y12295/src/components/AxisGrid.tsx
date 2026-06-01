import * as THREE from 'three';

const xDir = new THREE.Vector3(1, 0, 0);
const yDir = new THREE.Vector3(0, 1, 0);
const zDir = new THREE.Vector3(0, 0, 1);
const origin = new THREE.Vector3(0, 0, 0);

export function AxisGrid() {
  return (
    <group>
      <gridHelper
        args={[20, 20, 0x333366, 0x222244]}
        position={[0, -10, 0]}
      />
      
      <group position={[-10, -10, -10]}>
        <arrowHelper
          args={[xDir, origin, 4, 0xff4444, 0.3, 0.15]}
        />
        <arrowHelper
          args={[yDir, origin, 4, 0x44ff44, 0.3, 0.15]}
        />
        <arrowHelper
          args={[zDir, origin, 4, 0x4444ff, 0.3, 0.15]}
        />
      </group>
    </group>
  );
}
