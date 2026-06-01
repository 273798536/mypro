import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  routes,
  halls,
  stairways,
  getHallCenter,
  getStairwayCenter,
} from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

function getObjectCenter(id: string): [number, number, number] {
  const hall = halls.find((h) => h.id === id);
  if (hall) return getHallCenter(hall);
  const stair = stairways.find((s) => s.id === id);
  if (stair) return getStairwayCenter(stair);
  return [0, 0, 0];
}

function AnimatedSphere({
  segments,
  progress,
  speed,
}: {
  segments: { fromId: string; toId: string; order: number }[];
  progress: number;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(progress);
  const setProgress = useMuseumStore((s) => s.setRoutePlaybackProgress);

  const points = useMemo(
    () =>
      segments
        .sort((a, b) => a.order - b.order)
        .flatMap((seg) => [
          getObjectCenter(seg.fromId),
          getObjectCenter(seg.toId),
        ]),
    [segments]
  );

  useFrame((_, delta) => {
    if (!meshRef.current || points.length < 2) return;

    progressRef.current += delta * speed * 0.15;
    if (progressRef.current >= 1) {
      progressRef.current = 0;
    }
    setProgress(progressRef.current);

    const totalSegments = points.length - 1;
    const segFloat = progressRef.current * totalSegments;
    const segIndex = Math.min(Math.floor(segFloat), totalSegments - 1);
    const t = segFloat - segIndex;

    const from = points[segIndex];
    const to = points[Math.min(segIndex + 1, points.length - 1)];

    meshRef.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t
    );
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial
        color="#00E676"
        emissive="#00E676"
        emissiveIntensity={0.8}
      />
    </mesh>
  );
}

export default function RouteAnimation() {
  const { playingRouteId, routePlaybackSpeed, routePlaybackProgress, validationIssues } =
    useMuseumStore();

  const route = useMemo(
    () => routes.find((r) => r.id === playingRouteId),
    [playingRouteId]
  );

  const sortedSegments = useMemo(
    () =>
      route
        ? [...route.segments].sort((a, b) => a.order - b.order)
        : [],
    [route]
  );

  const breakpoints = useMemo(() => {
    if (!route) return [];
    return validationIssues
      .filter(
        (issue) =>
          issue.type === 'route_breakpoint' &&
          issue.affectedRoutes.includes(route.id)
      )
      .map((issue) => {
        const seg = route.segments.find(
          (s) => s.id === issue.relatedObjectId
        );
        return seg ? getObjectCenter(seg.toId) : null;
      })
      .filter(Boolean) as [number, number, number][];
  }, [route, validationIssues]);

  if (!route || sortedSegments.length === 0) return null;

  return (
    <group>
      {sortedSegments.map((seg) => {
        const from = getObjectCenter(seg.fromId);
        const to = getObjectCenter(seg.toId);
        return (
          <Line
            key={seg.id}
            points={[from, to]}
            color="#00E676"
            lineWidth={2}
          />
        );
      })}
      <AnimatedSphere
        segments={sortedSegments}
        progress={routePlaybackProgress}
        speed={routePlaybackSpeed}
      />
      {breakpoints.map((pos, i) => (
        <mesh key={`bp-${i}`} position={pos}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#FF5722"
            emissive="#FF5722"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
