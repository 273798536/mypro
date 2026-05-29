import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { computeForwardKinematics } from '@/utils/kinematics';
import { createArmCapsules, checkCollision } from '@/utils/collision';
import { JointTransform } from '@/types';

interface LinkProps {
  length: number;
  radius: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
}

const Link: React.FC<LinkProps> = ({ length, radius, color, emissive = '#000000', emissiveIntensity = 0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);

  const positions = useMemo(() => {
    return [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, length, 0),
    ];
  }, [length]);

  return (
    <group ref={groupRef}>
      <mesh ref={cylinderRef} position={[0, length / 2, 0]}>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      <mesh position={positions[0]}>
        <sphereGeometry args={[radius * 1.2, 16, 16]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.1}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.5}
        />
      </mesh>
      <mesh position={positions[1]}>
        <sphereGeometry args={[radius * 1.2, 16, 16]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.1}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.5}
        />
      </mesh>
    </group>
  );
};

interface JointProps {
  children: React.ReactNode;
  angle: number;
  axis: 'x' | 'y' | 'z';
  index: number;
}

const Joint: React.FC<JointProps> = ({ children, angle, axis, index }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { currentJointConfig, obstacles, selectedPointId, getPointById } = useWorkspaceStore();

  const selectedPoint = selectedPointId ? getPointById(selectedPointId) : null;
  const selectedJointAngles = selectedPoint?.jointAngles || currentJointConfig.jointAngles;

  const currentAngle = selectedPoint ? selectedJointAngles[index] : angle;

  useFrame(() => {
    if (groupRef.current) {
      const targetRotation = currentAngle;
      const currentRotation = groupRef.current.rotation[axis];
      const diff = targetRotation - currentRotation;
      groupRef.current.rotation[axis] = currentRotation + diff * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};

export const RobotArm: React.FC = () => {
  const { currentJointConfig, obstacles } = useWorkspaceStore(
    (state) => ({
      currentJointConfig: state.currentJointConfig,
      obstacles: state.obstacles,
    })
  );

  const dhParameters = currentJointConfig.dhParameters;
  const linkLengths = currentJointConfig.linkLengths;

  const transforms = useMemo<JointTransform[]>(() => {
    return computeForwardKinematics(dhParameters, currentJointConfig.jointAngles);
  }, [dhParameters, currentJointConfig.jointAngles]);

  const capsules = useMemo(() => {
    return createArmCapsules(transforms, linkLengths);
  }, [transforms, linkLengths]);

  const collisionResult = useMemo(() => {
    return checkCollision(capsules, obstacles);
  }, [capsules, obstacles]);

  const conflictingJoints = useMemo(() => {
    const joints = new Set<number>();
    if (collisionResult.hasCollision) {
      collisionResult.results.forEach((r) => {
        if (r.details.includes('连杆')) {
          const match = r.details.match(/连杆 (\d+)/);
          if (match) {
            joints.add(parseInt(match[1]) - 1);
          }
        }
      });
    }
    currentJointConfig.jointAngles.forEach((angle, i) => {
      const limit = currentJointConfig.jointLimits[i];
      if (limit && (angle < limit.min || angle > limit.max)) {
        joints.add(i);
      }
    });
    return joints;
  }, [collisionResult, currentJointConfig]);

  const jointRadii = [0.06, 0.055, 0.05, 0.045, 0.04, 0.035];
  const colors = ['#00f0ff', '#00d4e8', '#00b8d1', '#009cba', '#0080a3', '#00648c'];

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.04, 32]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.9} roughness={0.1} />
      </mesh>

      <Joint angle={currentJointConfig.jointAngles[0]} axis="z" index={0}>
        <Link
          length={linkLengths[0]}
          radius={jointRadii[0]}
          color={colors[0]}
          emissive={conflictingJoints.has(0) ? '#ff3b30' : '#00f0ff'}
          emissiveIntensity={conflictingJoints.has(0) ? 0.5 : 0.1}
        />
        <group position={[0, linkLengths[0], 0]}>
          <Joint angle={currentJointConfig.jointAngles[1]} axis="x" index={1}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <Link
                length={linkLengths[1]}
                radius={jointRadii[1]}
                color={colors[1]}
                emissive={conflictingJoints.has(1) ? '#ff3b30' : '#00d4e8'}
                emissiveIntensity={conflictingJoints.has(1) ? 0.5 : 0.1}
              />
              <group position={[0, linkLengths[1], 0]}>
                <Joint angle={currentJointConfig.jointAngles[2]} axis="x" index={2}>
                  <Link
                    length={linkLengths[2]}
                    radius={jointRadii[2]}
                    color={colors[2]}
                    emissive={conflictingJoints.has(2) ? '#ff3b30' : '#00b8d1'}
                    emissiveIntensity={conflictingJoints.has(2) ? 0.5 : 0.1}
                  />
                  <group position={[0, linkLengths[2], 0]}>
                    <Joint angle={currentJointConfig.jointAngles[3]} axis="x" index={3}>
                      <group rotation={[Math.PI / 2, 0, 0]}>
                        <Link
                          length={linkLengths[3]}
                          radius={jointRadii[3]}
                          color={colors[3]}
                          emissive={conflictingJoints.has(3) ? '#ff3b30' : '#009cba'}
                          emissiveIntensity={conflictingJoints.has(3) ? 0.5 : 0.1}
                        />
                        <group position={[0, linkLengths[3], 0]}>
                          <Joint angle={currentJointConfig.jointAngles[4]} axis="z" index={4}>
                            <Link
                              length={linkLengths[4]}
                              radius={jointRadii[4]}
                              color={colors[4]}
                              emissive={conflictingJoints.has(4) ? '#ff3b30' : '#0080a3'}
                              emissiveIntensity={conflictingJoints.has(4) ? 0.5 : 0.1}
                            />
                            <group position={[0, linkLengths[4], 0]}>
                              <Joint angle={currentJointConfig.jointAngles[5]} axis="x" index={5}>
                                <Link
                                  length={linkLengths[5]}
                                  radius={jointRadii[5]}
                                  color={colors[5]}
                                  emissive={conflictingJoints.has(5) ? '#ff3b30' : '#00648c'}
                                  emissiveIntensity={conflictingJoints.has(5) ? 0.5 : 0.1}
                                />
                                <group position={[0, linkLengths[5], 0]}>
                                  <mesh>
                                    <coneGeometry args={[0.04, 0.08, 8]} />
                                    <meshStandardMaterial
                                      color={conflictingJoints.has(5) ? '#ff3b30' : '#00f0ff'}
                                      emissive={conflictingJoints.has(5) ? '#ff3b30' : '#00f0ff'}
                                      emissiveIntensity={conflictingJoints.has(5) ? 0.8 : 0.3}
                                    />
                                  </mesh>
                                </group>
                              </Joint>
                            </group>
                          </Joint>
                        </group>
                      </group>
                    </Joint>
                  </group>
                </Joint>
              </group>
            </group>
          </Joint>
        </group>
      </Joint>
    </group>
  );
};
