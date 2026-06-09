import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store';

interface PointCloudViewProps {
  showSlice?: boolean;
  showOutliers?: boolean;
  showArm?: boolean;
  highlightOutlierId?: string | null;
  onPointClick?: (id: string) => void;
}

function PointsRender() {
  const pointCloud = useAppStore(s => s.pointCloud);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (pointCloud) {
      geo.setAttribute('position', new THREE.BufferAttribute(pointCloud.points, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(pointCloud.colors, 3));
    }
    return geo;
  }, [pointCloud]);

  if (!pointCloud) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial size={1.2} vertexColors transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function SlicePlane() {
  const params = useAppStore(s => s.sliceParams);
  const pointCloud = useAppStore(s => s.pointCloud);
  if (!pointCloud) return null;

  const normal = new THREE.Vector3(params.normalX, params.normalY, params.normalZ).normalize();
  const center = new THREE.Vector3(params.planeX, params.planeY, params.planeZ);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  const size = Math.max(
    pointCloud.bounds.maxX - pointCloud.bounds.minX,
    pointCloud.bounds.maxY - pointCloud.bounds.minY,
    pointCloud.bounds.maxZ - pointCloud.bounds.minZ,
  ) * 1.1;

  return (
    <mesh position={center.toArray()} quaternion={quaternion}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        color={params.isOutOfBounds ? '#C0392B' : '#E67E22'}
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function OutlierMarkers({ highlightId }: { highlightId?: string | null }) {
  const outliers = useAppStore(s => s.outlierPoints);
  const selectOutlier = useAppStore(s => s.selectOutlier);

  return (
    <group>
      {outliers.map(p => {
        const isHighlight = highlightId === p.id;
        return (
          <mesh
            key={p.id}
            position={[p.x_mm, p.y_mm, p.z_mm]}
            onClick={(e) => { e.stopPropagation(); selectOutlier(p.id); }}
          >
            <sphereGeometry args={[isHighlight ? 4 : 2.5, 16, 16]} />
            <meshBasicMaterial
              color={p.reviewed ? '#27AE60' : '#E67E22'}
              transparent
              opacity={isHighlight ? 1 : 0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function RobotArm({ time }: { time: number }) {
  const frames = useAppStore(s => s.collisionFrames);
  if (frames.length === 0) return null;

  const frame = frames.reduce((prev, curr) =>
    Math.abs(curr.timeSecond - time) < Math.abs(prev.timeSecond - time) ? curr : prev
  );
  const angles = frame.jointAngles;

  const segmentLen = [0, 60, 55, 45, 35, 25];
  let cumulativeRot = new THREE.Euler(0, 0, 0);

  return (
    <group position={[0, -80, 0]}>
      {angles.slice(0, 5).map((ang, i) => {
        cumulativeRot = new THREE.Euler(cumulativeRot.x + ang, cumulativeRot.y, cumulativeRot.z);
        return (
          <group
            key={i}
            rotation={[cumulativeRot.x, cumulativeRot.y, cumulativeRot.z]}
            position={[0, segmentLen[i], 0]}
          >
            <mesh>
              <cylinderGeometry args={[i === 0 ? 18 : 12 - i, 12 - i, segmentLen[i + 1] ?? 30, 16]} />
              <meshStandardMaterial
                color={frame.hasCollision && i >= 2 ? '#C0392B' : '#3498DB'}
                metalness={0.5}
                roughness={0.4}
              />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -5, 0]}>
        <cylinderGeometry args={[25, 30, 10, 32]} />
        <meshStandardMaterial color="#2C3E50" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Obstacle() {
  return (
    <group position={[90, 30, 150]}>
      <mesh>
        <boxGeometry args={[80, 120, 80]} />
        <meshStandardMaterial color="#7F8C8D" transparent opacity={0.6} />
      </mesh>
      <mesh>
        <boxGeometry args={[80, 120, 80]} />
        <meshStandardMaterial color="#95A5A6" wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export default function PointCloudScene({
  showSlice = false,
  showOutliers = false,
  showArm = false,
  highlightOutlierId,
}: PointCloudViewProps) {
  const currentTime = useAppStore(s => s.currentCollisionTime);

  return (
    <Canvas
      camera={{ position: [250, 200, 350], fov: 45 }}
      style={{ background: '#0A1628' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 200, 100]} intensity={1} />
      <directionalLight position={[-100, 100, -50]} intensity={0.4} />

      <Grid
        args={[500, 50]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#1A3A5C"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#2C3E50"
        fadeDistance={600}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <PointsRender />
      {showSlice && <SlicePlane />}
      {showOutliers && <OutlierMarkers highlightId={highlightOutlierId} />}
      {showArm && (
        <>
          <RobotArm time={currentTime ?? 0} />
          <Obstacle />
        </>
      )}

      <OrbitControls enableDamping dampingFactor={0.1} makeDefault />
    </Canvas>
  );
}
