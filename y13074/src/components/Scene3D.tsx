import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import StationModel from './StationModel';
import Terrain from './Terrain';
import RopewayLines from './RopewayLines';

interface CameraControllerProps {
  onCameraChange?: (pos: [number, number, number], target: [number, number, number]) => void;
}

function CameraController({ onCameraChange }: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  useEffect(() => {
    if (!currentView || !controlsRef.current) return;
    controlsRef.current.target.set(...currentView.target);
    camera.position.set(...currentView.position);
    controlsRef.current.update();
    const t = setTimeout(() => setCurrentView(null), 100);
    return () => clearTimeout(t);
  }, [currentView, camera, setCurrentView]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2 - 0.05}
      onChange={() => {
        if (onCameraChange && controlsRef.current) {
          onCameraChange(
            [camera.position.x, camera.position.y, camera.position.z],
            [
              controlsRef.current.target.x,
              controlsRef.current.target.y,
              controlsRef.current.target.z,
            ]
          );
        }
      }}
    />
  );
}

function SceneContent({
  onCameraSnapshot,
}: {
  onCameraSnapshot: (pos: [number, number, number], target: [number, number, number]) => void;
}) {
  const stationOptions = useAppStore((s) => s.stationOptions);
  const selectedOptionId = useAppStore((s) => s.selectedOptionId);
  const highlightedCommentId = useAppStore((s) => s.highlightedCommentId);
  const comments = useAppStore((s) => s.comments);
  const setSelectedOption = useAppStore((s) => s.setSelectedOption);
  const selectedTimelineId = useAppStore((s) => s.selectedTimelineId);

  const highlightedOptionId = highlightedCommentId
    ? comments.find((c) => c.id === highlightedCommentId)?.optionId
    : null;

  return (
    <>
      <PerspectiveCamera makeDefault position={[18, 16, 22]} fov={50} />
      <CameraController onCameraChange={onCameraSnapshot} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-10, 8, -10]} intensity={0.3} />
      <hemisphereLight args={['#bbdefb', '#558b2f', 0.4]} />

      <Terrain />
      <RopewayLines />

      {stationOptions.map((opt) => {
        const inTimeline =
          !selectedTimelineId ||
          comments.some(
            (c) =>
              c.optionId === opt.id && c.timelineSegmentId === selectedTimelineId
          );
        return (
          <group key={opt.id}>
            <StationModel
              option={opt}
              isSelected={selectedOptionId === opt.id}
              isHighlighted={
                highlightedOptionId === opt.id || selectedOptionId === opt.id
              }
              onClick={() =>
                setSelectedOption(selectedOptionId === opt.id ? null : opt.id)
              }
            />
            <Text
              position={[opt.position[0], opt.position[1] + 7, opt.position[2]]}
              fontSize={0.8}
              color={opt.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#ffffff"
            >
              {opt.code}方案
            </Text>
          </group>
        );
      })}

      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#94a3b8"
        sectionSize={5}
        sectionThickness={0.6}
        sectionColor="#64748b"
        fadeDistance={80}
        fadeStrength={0.5}
        position={[0, -0.05, 0]}
      />
    </>
  );
}

interface Props {
  onCameraSnapshot: (pos: [number, number, number], target: [number, number, number]) => void;
}

export default function Scene3D({ onCameraSnapshot }: Props) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-100 to-sky-50">
      <Canvas shadows dpr={[1, 2]}>
        <SceneContent onCameraSnapshot={onCameraSnapshot} />
      </Canvas>
    </div>
  );
}
