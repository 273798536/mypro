import { useMemo, useRef, useState, useEffect } from 'react';
import { Line, Tube, Html, Sphere } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDataStore } from '../../stores/useDataStore';
import { usePlaybackStore } from '../../stores/usePlaybackStore';
import { useFilterStore } from '../../stores/useFilterStore';
import type { RobotTrajectory } from '../../types';

interface RobotTrajectoriesProps {
  trajectories: RobotTrajectory[];
}

const ROBOT_COLORS: Record<string, string> = {
  'AGV-001': '#3B82F6',
  'AGV-002': '#10B981',
  'AGV-003': '#F59E0B',
  'AGV-004': '#EF4444',
  'AGV-005': '#8B5CF6',
};

function getRobotColor(robotId: string): string {
  return ROBOT_COLORS[robotId] || '#6B7280';
}

function TrajectoryLine({
  points,
  color,
  opacity = 0.6,
}: {
  points: [number, number, number][];
  color: string;
  opacity?: number;
}) {
  if (points.length < 2) return null;

  const curve = useMemo(() => {
    const vectorPoints = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.CatmullRomCurve3(vectorPoints, false, 'catmullrom', 0.5);
  }, [points]);

  return (
    <Tube args={[curve, Math.max(8, points.length), 0.08, 8, false]}>
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </Tube>
  );
}

function RobotMarker({
  position,
  robotId,
  status,
  isPlaying,
}: {
  position: [number, number, number];
  robotId: string;
  status: string;
  isPlaying: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = getRobotColor(robotId);

  useFrame((_, delta) => {
    if (meshRef.current && isPlaying) {
      meshRef.current.rotation.y += delta * 2;
    }
  });

  const statusColor =
    status === 'blocked' ? '#EF4444' : status === 'waiting' ? '#F59E0B' : '#10B981';

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.3, 16, 16]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </Sphere>
      <Sphere args={[0.15, 8, 8]} position={[0, 0.5, 0]}>
        <meshBasicMaterial color={statusColor} />
      </Sphere>
      <Html position={[0, 1, 0]} center distanceFactor={15}>
        <div className="bg-gray-900 bg-opacity-90 text-white px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg border border-gray-600">
          <div className="font-bold">{robotId}</div>
          <div className="text-gray-300">{status}</div>
        </div>
      </Html>
    </group>
  );
}

function WaitingPoint({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.2);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[0.4, 0.05, 8, 16]} />
      <meshBasicMaterial color="#F59E0B" transparent opacity={0.7} />
    </mesh>
  );
}

export function RobotTrajectories({ trajectories }: RobotTrajectoriesProps) {
  const { selectedRobots } = useFilterStore();
  const { isPlaying, currentTime, duration, selectedRobotId } = usePlaybackStore();
  const { setHoverInfo } = useDataStore();
  const [hoveredRobot, setHoveredRobot] = useState<string | null>(null);

  const groupedTrajectories = useMemo(() => {
    const groups: Record<string, RobotTrajectory[]> = {};
    trajectories.forEach((t) => {
      if (!groups[t.robotId]) {
        groups[t.robotId] = [];
      }
      groups[t.robotId].push(t);
    });
    Object.keys(groups).forEach((robotId) => {
      groups[robotId].sort((a, b) => a.timestamp - b.timestamp);
    });
    return groups;
  }, [trajectories]);

  const visibleRobotIds = useMemo(() => {
    const allIds = Object.keys(groupedTrajectories);
    if (selectedRobots.length === 0) return allIds;
    return allIds.filter((id) => selectedRobots.includes(id));
  }, [groupedTrajectories, selectedRobots]);

  const currentPositions = useMemo(() => {
    const positions: Record<string, { position: [number, number, number]; status: string }> = {};

    visibleRobotIds.forEach((robotId) => {
      const robotTrajectories = groupedTrajectories[robotId];
      if (!robotTrajectories || robotTrajectories.length === 0) return;

      const targetTime = currentTime;
      let closest = robotTrajectories[0];
      let minDiff = Infinity;

      robotTrajectories.forEach((t) => {
        const diff = Math.abs(t.timestamp - robotTrajectories[0].timestamp - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = t;
        }
      });

      positions[robotId] = {
        position: [closest.position.x, closest.position.y, closest.position.z],
        status: closest.status,
      };
    });

    return positions;
  }, [groupedTrajectories, visibleRobotIds, currentTime]);

  const waitingPoints = useMemo(() => {
    const points: [number, number, number][] = [];
    visibleRobotIds.forEach((robotId) => {
      const robotTrajectories = groupedTrajectories[robotId];
      if (!robotTrajectories) return;

      robotTrajectories.forEach((t, i) => {
        if (t.status === 'waiting' || t.status === 'blocked') {
          if (i === 0 || robotTrajectories[i - 1].status !== t.status) {
            points.push([t.position.x, t.position.y + 0.1, t.position.z]);
          }
        }
      });
    });
    return points;
  }, [groupedTrajectories, visibleRobotIds]);

  return (
    <group>
      {visibleRobotIds.map((robotId) => {
        const robotTrajectories = groupedTrajectories[robotId];
        if (!robotTrajectories) return null;

        const points: [number, number, number][] = robotTrajectories.map((t) => [
          t.position.x,
          t.position.y,
          t.position.z,
        ]);

        const showFullTrajectory = !selectedRobotId || selectedRobotId === robotId;

        return (
          <group key={robotId}>
            {showFullTrajectory && (
              <TrajectoryLine
                points={points}
                color={getRobotColor(robotId)}
                opacity={selectedRobotId === robotId ? 0.8 : 0.3}
              />
            )}
          </group>
        );
      })}

      {waitingPoints.map((point, i) => (
        <WaitingPoint key={`wait-${i}`} position={point} />
      ))}

      {Object.entries(currentPositions).map(([robotId, data]) => (
        <group
          key={robotId}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredRobot(robotId);
          }}
          onPointerOut={() => setHoveredRobot(null)}
        >
          <RobotMarker
            position={data.position}
            robotId={robotId}
            status={data.status}
            isPlaying={isPlaying}
          />
        </group>
      ))}
    </group>
  );
}
