import { useMemo } from 'react';
import { Sphere, Text } from '@react-three/drei';
import { FingerKeypoint, HandType, NORMAL_KEYPOINT_COLOR, ERROR_COLORS } from '@/types';
import * as THREE from 'three';

interface HandKeypointsProps {
  keypoints: FingerKeypoint[];
  hand: HandType;
  errorType?: string;
  hasDataGap: boolean;
}

export function HandKeypoints({ keypoints, hand, errorType, hasDataGap }: HandKeypointsProps) {
  const keypointData = useMemo(() => {
    return keypoints.map((kp) => ({
      ...kp,
      color: kp.isMissing
        ? ERROR_COLORS.missing_keypoint
        : errorType
        ? ERROR_COLORS[errorType as keyof typeof ERROR_COLORS] || NORMAL_KEYPOINT_COLOR
        : NORMAL_KEYPOINT_COLOR,
      opacity: hasDataGap ? 0.3 : kp.isMissing ? 0.5 : 1,
    }));
  }, [keypoints, errorType, hasDataGap]);

  return (
    <group>
      {keypointData.map((kp) => (
        <group key={kp.id}>
          <Sphere position={[kp.x, kp.y, kp.z]} args={[0.015, 16, 16]}>
            <meshStandardMaterial
              color={kp.color}
              transparent
              opacity={kp.opacity}
              emissive={kp.color}
              emissiveIntensity={kp.isMissing ? 0.5 : 0.2}
            />
          </Sphere>
          {kp.isMissing && (
            <Text
              position={[kp.x, kp.y + 0.03, kp.z]}
              fontSize={0.02}
              color="#E74C3C"
              anchorX="center"
              anchorY="middle"
            >
              !
            </Text>
          )}
        </group>
      ))}
      
      {keypointData.length > 1 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={keypointData.length * 2}
              array={new Float32Array(keypointData.flatMap((kp, i) => {
                const next = keypointData[(i + 1) % keypointData.length];
                return [kp.x, kp.y, kp.z, next.x, next.y, next.z];
              }))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            color={hand === 'left' ? '#3498DB' : '#E67E22'} 
            transparent 
            opacity={hasDataGap ? 0.2 : 0.4} 
          />
        </lineSegments>
      )}
    </group>
  );
}
