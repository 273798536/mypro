import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { getGimbalAxisPositions } from '../../engine/attitudeCalculator';
import { AXIS_COLORS, SCENE_CONFIG } from '../../utils/constants';
import { degToRad } from '../../utils/math';

interface GimbalAxesProps {
  showLabels?: boolean;
}

export const GimbalAxes = ({ showLabels = true }: GimbalAxesProps) => {
  const pitchAxisRef = useRef<THREE.Group>(null);
  const yawAxisRef = useRef<THREE.Group>(null);
  const rollAxisRef = useRef<THREE.Group>(null);

  const { currentAngles, gimbalLockState } = useAttitudeStore();

  const axisPositions = useMemo(() => {
    return getGimbalAxisPositions(currentAngles, SCENE_CONFIG.axisLength);
  }, [currentAngles]);

  useFrame((state, delta) => {
    const axes = ['pitch', 'yaw', 'roll'] as const;
    const refs = { pitch: pitchAxisRef, yaw: yawAxisRef, roll: rollAxisRef };

    axes.forEach((axis) => {
      const ref = refs[axis];
      if (ref.current) {
        const positions = axisPositions[axis];
        const start = positions[0];
        const end = positions[1];

        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        ref.current.position.copy(mid);

        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        ref.current.quaternion.copy(quaternion);

        if (gimbalLockState.isLocked && (axis === 'yaw' || axis === 'roll')) {
          const child = ref.current.children[0] as THREE.Mesh;
          const material = child.material as THREE.MeshStandardMaterial;
          const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.3 + 0.7;
          material.emissiveIntensity = pulse;
        }
      }
    });
  });

  const createAxis = (axis: 'pitch' | 'yaw' | 'roll', label: string) => {
    const positions = axisPositions[axis];
    const length = positions[1].distanceTo(positions[0]);
    const isLocked = gimbalLockState.isLocked && (axis === 'yaw' || axis === 'roll');
    const color = AXIS_COLORS[axis];

    return (
      <group ref={axis === 'pitch' ? pitchAxisRef : axis === 'yaw' ? yawAxisRef : rollAxisRef}>
        <mesh>
          <cylinderGeometry args={[SCENE_CONFIG.axisRadius, SCENE_CONFIG.axisRadius, length, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={isLocked ? '#ff0000' : color}
            emissiveIntensity={isLocked ? 0.8 : 0.3}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, length / 2 + 0.15, 0]}>
          <coneGeometry args={[SCENE_CONFIG.axisRadius * 2.5, 0.3, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {createAxis('pitch', 'X')}
      {createAxis('yaw', 'Y')}
      {createAxis('roll', 'Z')}
    </group>
  );
};
