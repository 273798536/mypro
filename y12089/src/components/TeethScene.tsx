import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  createUpperJaw,
  createLowerJaw,
  applyMalocclusion,
  applyGrinding
} from '@/utils/teethModel';
import { ContactPoint, Malocclusion, GrindingArea, Annotation, ViewMode, CameraMode } from '@/types';

interface JawProps {
  viewMode: ViewMode;
  isComplexCase: boolean;
}

function JawModels({ viewMode, isComplexCase }: JawProps) {
  const upperRef = useRef<THREE.Group>(null);
  const lowerRef = useRef<THREE.Group>(null);

  const { upperJaw, lowerJaw } = useMemo(() => {
    const upper = createUpperJaw();
    const lower = createLowerJaw();
    applyMalocclusion(upper, lower, isComplexCase);
    applyGrinding(upper, lower, isComplexCase);
    return { upperJaw: upper, lowerJaw: lower };
  }, [isComplexCase]);

  useFrame((state) => {
    if (!upperRef.current || !lowerRef.current) return;

    const time = state.clock.elapsedTime;
    
    switch (viewMode) {
      case 'exploded':
        upperRef.current.position.y = THREE.MathUtils.lerp(
          upperRef.current.position.y,
          2.5,
          0.05
        );
        lowerRef.current.position.y = THREE.MathUtils.lerp(
          lowerRef.current.position.y,
          -2.5,
          0.05
        );
        break;
      case 'upper':
        lowerRef.current.visible = false;
        upperRef.current.visible = true;
        upperRef.current.position.y = THREE.MathUtils.lerp(
          upperRef.current.position.y,
          0,
          0.05
        );
        break;
      case 'lower':
        upperRef.current.visible = false;
        lowerRef.current.visible = true;
        lowerRef.current.position.y = THREE.MathUtils.lerp(
          lowerRef.current.position.y,
          0,
          0.05
        );
        break;
      default:
        upperRef.current.visible = true;
        lowerRef.current.visible = true;
        upperRef.current.position.y = THREE.MathUtils.lerp(
          upperRef.current.position.y,
          1,
          0.05
        );
        lowerRef.current.position.y = THREE.MathUtils.lerp(
          lowerRef.current.position.y,
          -1,
          0.05
        );
    }
  });

  return (
    <group>
      <primitive ref={upperRef} object={upperJaw} position={[0, 1, 0]} />
      <primitive ref={lowerRef} object={lowerJaw} position={[0, -1, 0]} />
    </group>
  );
}

interface ContactPointsProps {
  points: ContactPoint[];
  visible: boolean;
  onSelect: (id: string) => void;
  selectedId?: string;
}

function ContactPointsMarkers({ points, visible, onSelect, selectedId }: ContactPointsProps) {
  if (!visible) return null;

  const getColor = (type: ContactPoint['type']) => {
    switch (type) {
      case 'normal': return '#36B37E';
      case 'misaligned': return '#F53F3F';
      case 'grinding': return '#FF7D00';
      case 'conflict': return '#722ED1';
    }
  };

  const getSize = (type: ContactPoint['type']) => {
    switch (type) {
      case 'normal': return 0.2;
      case 'misaligned': return 0.3;
      case 'grinding': return 0.35;
      case 'conflict': return 0.4;
    }
  };

  return (
    <group>
      {points.map((point) => (
        <group key={point.id}>
          <mesh
            position={[point.position.x, point.position.y, point.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(point.id);
            }}
          >
            <sphereGeometry args={[getSize(point.type), 16, 16]} />
            <meshStandardMaterial
              color={getColor(point.type)}
              emissive={getColor(point.type)}
              emissiveIntensity={selectedId === point.id ? 0.8 : 0.3}
              transparent
              opacity={selectedId === point.id ? 1 : 0.9}
            />
          </mesh>
            <pointLight
              position={[point.position.x, point.position.y + 0.5, point.position.z]}
              color={getColor(point.type)}
              intensity={0.5}
              distance={2}
            />
        </group>
      ))}
    </group>
  );
}

interface AnnotationLabelProps {
  annotation: Annotation;
  onSelect?: () => void;
  isSelected?: boolean;
}

function AnnotationLabel({ annotation, onSelect, isSelected }: AnnotationLabelProps) {
  return (
    <Html
      position={[annotation.position.x, annotation.position.y, annotation.position.z]}
      center
    >
      <div
        onClick={onSelect}
        className={`
          px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
          transition-all duration-200 cursor-pointer
          ${isSelected 
            ? 'scale-110 shadow-lg' 
            : 'hover:scale-105'
          }
        `}
        style={{
          backgroundColor: `${annotation.color}20`,
          border: `2px solid ${annotation.color}`,
          color: annotation.color,
          backdropFilter: 'blur(8px)',
          boxShadow: isSelected ? `0 0 20px ${annotation.color}40` : 'none'
        }}
      >
        <div className="font-bold">{annotation.label}</div>
      </div>
    </Html>
  );
}

interface AnnotationsProps {
  malocclusions: Malocclusion[];
  grindingAreas: GrindingArea[];
  contactPoints: ContactPoint[];
  visible: boolean;
  showMalocclusions: boolean;
  showGrindingAreas: boolean;
  onSelect: (id: string) => void;
  selectedId?: string;
}

function AnnotationsLayer({
  malocclusions,
  grindingAreas,
  contactPoints,
  visible,
  showMalocclusions: showMal,
  showGrindingAreas: showGrind,
  onSelect,
  selectedId
}: AnnotationsProps) {
  if (!visible) return null;

  const allAnnotations: { id: string; annotation: Annotation }[] = [];

  if (showMal) {
    malocclusions.forEach((m) => {
      allAnnotations.push({ id: m.id, annotation: m.annotation });
    });
  }

  if (showGrind) {
    grindingAreas.forEach((g) => {
      allAnnotations.push({ id: g.id, annotation: g.annotation });
    });
  }

  contactPoints.forEach((cp) => {
    if (cp.annotation && cp.type !== 'normal') {
      allAnnotations.push({ id: cp.id, annotation: cp.annotation });
    }
  });

  return (
    <group>
      {allAnnotations.map(({ id, annotation }) => (
        <AnnotationLabel
          key={id}
          annotation={annotation}
          onSelect={() => onSelect(id)}
          isSelected={selectedId === id}
        />
      ))}
    </group>
  );
}

interface ArrowProps {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}

function Arrow({ from, to, color }: ArrowProps) {
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const length = from.distanceTo(to);

  return (
    <group position={from}>
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, length, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

interface MalocclusionArrowsProps {
  malocclusions: Malocclusion[];
  visible: boolean;
}

function MalocclusionArrows({ malocclusions, visible }: MalocclusionArrowsProps) {
  if (!visible) return null;

  return (
    <group>
      {malocclusions.map((m) => {
        const dir = new THREE.Vector3(m.direction.x, m.direction.y, m.direction.z);
        return (
          <arrowHelper
            key={m.id}
            args={[
              dir,
              new THREE.Vector3(
                m.annotation.position.x - m.direction.x * 2,
                m.annotation.position.y,
                m.annotation.position.z
              ),
              m.distance * 2,
              m.annotation.color,
              0.5,
              0.3
            ]}
          />
        );
      })}
    </group>
  );
}

interface CameraControllerProps {
  mode: CameraMode;
}

function CameraController({ mode }: CameraControllerProps) {
  const { camera } = useThree();

  useEffect(() => {
    if (mode === 'orthographic') {
      camera.position.set(0, 15, 20);
      camera.lookAt(0, 0, 0);
    }
  }, [mode, camera]);

  return null;
}

interface SceneProps {
  viewMode: ViewMode;
  cameraMode: CameraMode;
  isComplexCase: boolean;
  contactPoints: ContactPoint[];
  malocclusions: Malocclusion[];
  grindingAreas: GrindingArea[];
  showContactPoints: boolean;
  showMalocclusions: boolean;
  showGrindingAreas: boolean;
  showAnnotations: boolean;
  onSelectItem: (id: string) => void;
  selectedItemId?: string;
}

export function TeethScene({
  viewMode,
  cameraMode,
  isComplexCase,
  contactPoints,
  malocclusions,
  grindingAreas,
  showContactPoints,
  showMalocclusions,
  showGrindingAreas,
  showAnnotations,
  onSelectItem,
  selectedItemId
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 15, 20], fov: 50 }}
      gl={{ antialias: true }}
      style={{ background: 'linear-gradient(180deg, #1D2129 0%, #2D3748 100%)' }}
    >
      <CameraController mode={cameraMode} />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
      />
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.5}
      />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#4A5568', 0.3]} />

      <JawModels
        viewMode={viewMode}
        isComplexCase={isComplexCase}
      />

      <ContactPointsMarkers
        points={contactPoints}
        visible={showContactPoints}
        onSelect={onSelectItem}
        selectedId={selectedItemId}
      />

      <MalocclusionArrows
        malocclusions={malocclusions}
        visible={showMalocclusions}
      />

      <AnnotationsLayer
        malocclusions={malocclusions}
        grindingAreas={grindingAreas}
        contactPoints={contactPoints}
        visible={showAnnotations}
        showMalocclusions={showMalocclusions}
        showGrindingAreas={showGrindingAreas}
        onSelect={onSelectItem}
        selectedId={selectedItemId}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={40}
      />

      <gridHelper args={[30, 30, '#4A5568', '#2D3748']} position={[0, -3, 0]} />
    </Canvas>
  );
}
