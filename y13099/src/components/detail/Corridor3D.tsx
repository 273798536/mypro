import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Sky, Line, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { TimelineNode, PlanDetail } from "@shared/types";

interface Corridor3DProps {
  planDetail: PlanDetail | null;
  currentNode: TimelineNode | null;
  onSegmentClick?: (segmentIndex: number) => void;
}

function CorridorPath({
  segmentCount,
  highlightIndex,
  onSegmentClick,
}: {
  segmentCount: number;
  highlightIndex: number | null;
  onSegmentClick?: (index: number) => void;
}) {
  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = Math.max(segmentCount, 1);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * 80 - 40;
      const y = Math.sin(t * Math.PI * 1.5) * 5 + 8;
      const z = Math.cos(t * Math.PI * 0.8) * 10;
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, [segmentCount]);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.5);
  }, [curvePoints]);

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, segmentCount * 20, 0.6, 8, false);
  }, [curve, segmentCount]);

  return (
    <group>
      <mesh geometry={tubeGeometry} receiveShadow>
        <meshStandardMaterial
          color="#1A1F26"
          transparent
          opacity={0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color="#00D4AA"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {Array.from({ length: segmentCount }).map((_, idx) => {
        const t1 = idx / segmentCount;
        const t2 = (idx + 1) / segmentCount;
        const segPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= 10; i++) {
          const t = t1 + (t2 - t1) * (i / 10);
          segPoints.push(curve.getPointAt(t));
        }
        const isHighlighted = highlightIndex === idx;
        return (
          <group key={idx}>
            <Line
              points={segPoints}
              color={isHighlighted ? "#00D4AA" : "#2A3139"}
              lineWidth={isHighlighted ? 4 : 2}
              transparent
              opacity={isHighlighted ? 1 : 0.6}
            />
            {isHighlighted && (
              <HighlightSegment points={segPoints} />
            )}
          </group>
        );
      })}

      {Array.from({ length: segmentCount }).map((_, idx) => {
        const t = (idx + 0.5) / segmentCount;
        const point = curve.getPointAt(t);
        const isHighlighted = highlightIndex === idx;
        return (
          <mesh
            key={`node-${idx}`}
            position={point}
            onClick={(e) => {
              e.stopPropagation();
              onSegmentClick?.(idx);
            }}
          >
            <sphereGeometry args={[isHighlighted ? 0.8 : 0.5, 16, 16]} />
            <meshBasicMaterial
              color={isHighlighted ? "#00D4AA" : "#FFB020"}
              transparent
              opacity={isHighlighted ? 0.9 : 0.6}
            />
            {isHighlighted && (
              <Html
                center
                distanceFactor={15}
                position={[0, 2, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div className="bg-background/95 border border-primary/50 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap text-primary font-medium shadow-glow">
                  第 {idx + 1} 航段 · 当前选中
                </div>
              </Html>
            )}
          </mesh>
        );
      })}
    </group>
  );
}

function HighlightSegment({ points }: { points: THREE.Vector3[] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const elapsed = clock.getElapsedTime();
      const pulse = 0.5 + Math.sin(elapsed * 3) * 0.5;
      meshRef.current.scale.setScalar(1 + pulse * 0.15);
    }
  });

  const positions = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const perp = new THREE.Vector3()
        .crossVectors(dir, new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(1.2);
      pos.push(
        p1.x + perp.x,
        p1.y + perp.y,
        p1.z + perp.z,
        p1.x - perp.x,
        p1.y - perp.y,
        p1.z - perp.z,
        p2.x + perp.x,
        p2.y + perp.y,
        p2.z + perp.z,
        p2.x + perp.x,
        p2.y + perp.y,
        p2.z + perp.z,
        p1.x - perp.x,
        p1.y - perp.y,
        p1.z - perp.z,
        p2.x - perp.x,
        p2.y - perp.y,
        p2.z - perp.z
      );
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return geo;
  }, [points]);

  return (
    <mesh ref={meshRef} geometry={positions}>
      <meshBasicMaterial
        color="#00D4AA"
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SensorMarkers({
  segmentCount,
  currentNode,
  planDetail,
}: {
  segmentCount: number;
  currentNode: TimelineNode | null;
  planDetail: PlanDetail | null;
}) {
  const markers = useMemo(() => {
    const result: Array<{
      position: THREE.Vector3;
      color: string;
      label: string;
    }> = [];
    if (!planDetail) return result;
    const segments = Math.max(segmentCount, 1);
    for (let i = 0; i < segments; i++) {
      const t = (i + 0.5) / segments;
      const x = t * 80 - 40;
      const y = Math.sin(t * Math.PI * 1.5) * 5 + 9;
      const z = Math.cos(t * Math.PI * 0.8) * 10;
      result.push({
        position: new THREE.Vector3(x, y + 1.5, z),
        color: i === currentNode?.corridorSegmentIndex ? "#FFB020" : "#FFB020",
        label: `S${i + 1}`,
      });
    }
    return result;
  }, [segmentCount, currentNode, planDetail]);

  return (
    <group>
      {markers.map((marker, idx) => (
        <PulsingMarker
          key={idx}
          position={marker.position}
          color={marker.color}
          label={marker.label}
          isActive={idx === currentNode?.corridorSegmentIndex}
        />
      ))}
    </group>
  );
}

function PulsingMarker({
  position,
  color,
  label,
  isActive,
}: {
  position: THREE.Vector3;
  color: string;
  label: string;
  isActive: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current && isActive) {
      const elapsed = clock.getElapsedTime();
      const scale = 1 + Math.sin(elapsed * 4) * 0.3;
      ref.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[isActive ? 0.35 : 0.2, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 1 : 0.7} />
      </mesh>
      {isActive && (
        <Html
          center
          distanceFactor={12}
          position={[0, 1.5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-warning/15 border border-warning/40 px-2 py-1 rounded text-[10px] text-warning font-mono">
            传感器 {label}
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraController({
  targetSegment,
  segmentCount,
}: {
  targetSegment: number | null;
  segmentCount: number;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 10, 0));

  useEffect(() => {
    if (targetSegment != null) {
      const segments = Math.max(segmentCount, 1);
      const t = (targetSegment + 0.5) / segments;
      const x = t * 80 - 40;
      const y = Math.sin(t * Math.PI * 1.5) * 5 + 12;
      const z = Math.cos(t * Math.PI * 0.8) * 10 + 25;
      targetRef.current.set(x, y + 8, z);
    }
  }, [targetSegment, segmentCount]);

  useFrame(() => {
    camera.position.lerp(targetRef.current, 0.02);
    const lookAt = targetSegment != null
      ? new THREE.Vector3(
          ((targetSegment + 0.5) / Math.max(segmentCount, 1)) * 80 - 40,
          Math.sin(((targetSegment + 0.5) / Math.max(segmentCount, 1)) * Math.PI * 1.5) * 5 + 8,
          Math.cos(((targetSegment + 0.5) / Math.max(segmentCount, 1)) * Math.PI * 0.8) * 10
        )
      : new THREE.Vector3(0, 8, 0);
    camera.lookAt(lookAt);
  });

  return null;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[300, 300, 50, 50]} />
      <meshStandardMaterial
        color="#0F1419"
        roughness={0.9}
        metalness={0.1}
      />
      <gridHelper args={[200, 40, "#2A3139", "#1A1F26"]} position={[0, 0.1, 0]} />
    </mesh>
  );
}

export function Corridor3D({
  planDetail,
  currentNode,
  onSegmentClick,
}: Corridor3DProps) {
  const segmentCount = planDetail?.timeline
    .map((n) => n.corridorSegmentIndex)
    .filter((i) => i != null)
    .reduce((max, i) => Math.max(max, (i as number) + 1), 6) || 6;

  const highlightIndex =
    currentNode?.corridorSegmentIndex != null
      ? currentNode.corridorSegmentIndex
      : null;

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 25, 35], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0F1419"]} />
        <fog attach="fog" args={["#0F1419", 50, 120]} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[30, 50, 30]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[0, 20, 0]} intensity={0.3} color="#00D4AA" />

        <Stars
          radius={150}
          depth={60}
          count={1500}
          factor={3}
          fade
          speed={0.3}
        />

        <Ground />

        <CorridorPath
          segmentCount={segmentCount}
          highlightIndex={highlightIndex}
          onSegmentClick={onSegmentClick}
        />

        <SensorMarkers
          segmentCount={segmentCount}
          currentNode={currentNode}
          planDetail={planDetail}
        />

        <CameraController
          targetSegment={highlightIndex}
          segmentCount={segmentCount}
        />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={15}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.1}
        />

        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <div className="absolute top-4 left-4 bg-background/70 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>实时渲染</span>
        </div>
        <div className="text-[10px] text-muted font-mono">
          航段数: {segmentCount} | 选中:{" "}
          {highlightIndex != null ? `第 ${highlightIndex + 1} 航段` : "无"}
        </div>
      </div>
    </div>
  );
}
