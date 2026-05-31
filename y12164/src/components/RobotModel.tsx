import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/appStore';
import type { RobotJoint, RobotLink } from '../types';

interface JointProps {
  joint: RobotJoint;
  isSelected: boolean;
  hasIssue: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

const JointMesh = ({ joint, isSelected, hasIssue, onClick, children }: JointProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  const color = useMemo(() => {
    if (hasIssue) return '#F53F3F';
    if (isSelected) return '#FF7D00';
    return joint.color;
  }, [joint.color, isSelected, hasIssue]);

  return (
    <group ref={groupRef} position={joint.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <cylinderGeometry args={[0.08, 0.1, 0.15, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          emissive={isSelected || hasIssue ? color : '#000000'}
          emissiveIntensity={isSelected || hasIssue ? 0.3 : 0}
        />
      </mesh>

      {(isSelected || hasIssue) && (
        <Html position={[0, 0.15, 0]} center distanceFactor={10}>
          <div
            className={`px-2 py-1 rounded text-xs font-mono whitespace-nowrap ${
              hasIssue
                ? 'bg-danger-500 text-white'
                : 'bg-primary-500 text-white'
            }`}
          >
            {joint.name}
          </div>
        </Html>
      )}

      {children}
    </group>
  );
};

interface LinkProps {
  link: RobotLink;
  startPos: [number, number, number];
  endPos: [number, number, number];
  hasMissingLoad: boolean;
}

const LinkMesh = ({ link, startPos, endPos, hasMissingLoad }: LinkProps) => {
  const length = Math.sqrt(
    Math.pow(endPos[0] - startPos[0], 2) +
    Math.pow(endPos[1] - startPos[1], 2) +
    Math.pow(endPos[2] - startPos[2], 2)
  );

  const midPoint: [number, number, number] = [
    (startPos[0] + endPos[0]) / 2,
    (startPos[1] + endPos[1]) / 2,
    (startPos[2] + endPos[2]) / 2,
  ];

  const direction = new THREE.Vector3(
    endPos[0] - startPos[0],
    endPos[1] - startPos[1],
    endPos[2] - startPos[2]
  ).normalize();

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return (
    <group position={midPoint} quaternion={quaternion}>
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, length, 12]} />
        <meshStandardMaterial
          color={hasMissingLoad ? '#F53F3F' : '#4E5969'}
          metalness={0.6}
          roughness={0.4}
          wireframe={hasMissingLoad}
        />
      </mesh>

      {hasMissingLoad && (
        <Html position={[0, 0, 0.1]} center distanceFactor={8}>
          <div className="px-2 py-1 bg-danger-500 text-white rounded text-xs font-mono whitespace-nowrap animate-pulse border-2 border-dashed border-danger-300">
            ⚠️ 负载缺失: {link.name}
          </div>
        </Html>
      )}
    </group>
  );
};

const Scene = () => {
  const { robotConfig, selectedJointId, selectJoint, issues } = useAppStore();

  if (!robotConfig) return null;

  const jointsWithIssues = new Set(
    issues
      .filter((i) => i.type === 'torque_over_limit' || i.type === 'angle_out_of_range')
      .map((i) => i.referenceId)
  );

  const linksWithMissingLoad = new Set(
    issues
      .filter((i) => i.type === 'missing_load')
      .map((i) => i.referenceId)
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} />

      <gridHelper args={[5, 10, '#4E5969', '#272E3B']} position={[0, -0.1, 0]} />

      {robotConfig.joints.map((joint, index) => {
        const nextJoint = robotConfig.joints[index + 1];
        const link = robotConfig.links[index];

        return (
          <group key={joint.id}>
            <JointMesh
              joint={joint}
              isSelected={selectedJointId === joint.id}
              hasIssue={jointsWithIssues.has(joint.id)}
              onClick={() => selectJoint(joint.id === selectedJointId ? null : joint.id)}
            >
              {nextJoint && link && (
                <LinkMesh
                  link={link}
                  startPos={[0, 0, 0]}
                  endPos={[
                    nextJoint.position[0] - joint.position[0],
                    nextJoint.position[1] - joint.position[1],
                    nextJoint.position[2] - joint.position[2],
                  ]}
                  hasMissingLoad={linksWithMissingLoad.has(link.id)}
                />
              )}
            </JointMesh>
          </group>
        );
      })}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
      />
    </>
  );
};

export const RobotModel = () => {
  return (
    <div className="w-full h-full bg-industrial-700 rounded-lg overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-industrial-600/90 backdrop-blur px-3 py-2 rounded-lg border border-industrial-500">
          <p className="text-xs text-industrial-300 font-mono">3D 模型视图</p>
          <p className="text-xs text-primary-400 mt-1">点击关节查看详细数据</p>
        </div>
      </div>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        style={{ background: 'linear-gradient(180deg, #1D2129 0%, #272E3B 100%)' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
