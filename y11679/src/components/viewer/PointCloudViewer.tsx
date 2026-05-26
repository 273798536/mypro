import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { PointCloudData, Annotation, BoundingBox } from '../../types';
import { DAMAGE_LEVEL_COLORS } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { POINT_CLOUD_POINT_SIZE, ANNOTATION_BOX_OPACITY } from '../../utils/constants';

interface PointCloudMeshProps {
  pointcloud: PointCloudData;
  visible: boolean;
}

const PointCloudMesh: React.FC<PointCloudMeshProps> = ({ pointcloud, visible }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(pointcloud.points.length * 3);
    const colors = new Float32Array(pointcloud.points.length * 3);

    pointcloud.points.forEach((p, i) => {
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      colors[i * 3] = p.r;
      colors[i * 3 + 1] = p.g;
      colors[i * 3 + 2] = p.b;
    });

    return { pos, colors };
  }, [pointcloud]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(positions.colors, 3));
    return geo;
  }, [positions]);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.visible = visible;
    }
  }, [visible]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={POINT_CLOUD_POINT_SIZE}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  );
};

interface AnnotationBoxProps {
  annotation: Annotation;
  isSelected: boolean;
  onClick: () => void;
}

const AnnotationBox: React.FC<AnnotationBoxProps> = ({ annotation, isSelected, onClick }) => {
  const box = annotation.box;
  const color = DAMAGE_LEVEL_COLORS[annotation.damageLevel];
  const size: [number, number, number] = [
    box.max.x - box.min.x,
    box.max.y - box.min.y,
    box.max.z - box.min.z,
  ];
  const position: [number, number, number] = [
    (box.min.x + box.max.x) / 2,
    (box.min.y + box.max.y) / 2,
    (box.min.z + box.max.z) / 2,
  ];

  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={size} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.4 : ANNOTATION_BOX_OPACITY}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], size[1], size[2])]} />
        <lineBasicMaterial color={color} linewidth={isSelected ? 2 : 1} />
      </lineSegments>
    </group>
  );
};

interface BoxSelectionOverlayProps {
  isSelecting: boolean;
  startPoint: THREE.Vector3 | null;
  endPoint: THREE.Vector3 | null;
}

const BoxSelectionOverlay: React.FC<BoxSelectionOverlayProps> = ({
  isSelecting,
  startPoint,
  endPoint,
}) => {
  if (!isSelecting || !startPoint || !endPoint) return null;

  const minX = Math.min(startPoint.x, endPoint.x);
  const maxX = Math.max(startPoint.x, endPoint.x);
  const minY = Math.min(startPoint.y, endPoint.y);
  const maxY = Math.max(startPoint.y, endPoint.y);
  const minZ = Math.min(startPoint.z, endPoint.z);
  const maxZ = Math.max(startPoint.z, endPoint.z);

  const size: [number, number, number] = [maxX - minX, maxY - minY, maxZ - minZ];
  const position: [number, number, number] = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.2} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], size[1], size[2])]} />
        <lineBasicMaterial color="#3B82F6" linewidth={2} />
      </lineSegments>
    </group>
  );
};

interface CameraControllerProps {
  position: [number, number, number];
}

const CameraController: React.FC<CameraControllerProps> = ({ position }) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(0, 0, 0);
  }, [position, camera]);

  return null;
};

interface SceneContentProps {
  pointclouds: PointCloudData[];
  activePointcloudId: string | null;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  selectionMode: 'view' | 'box-select' | 'edit';
  onSelectAnnotation: (id: string | null) => void;
  onBoxSelect: (box: BoundingBox) => void;
  cameraPosition: [number, number, number];
  containerRef: React.RefObject<HTMLDivElement>;
  setIsSelecting: (value: boolean) => void;
  setStartPoint: (point: THREE.Vector3 | null) => void;
  setEndPoint: (point: THREE.Vector3 | null) => void;
  isSelecting: boolean;
  startPoint: THREE.Vector3 | null;
  endPoint: THREE.Vector3 | null;
}

const SceneContent: React.FC<SceneContentProps> = ({
  pointclouds,
  activePointcloudId,
  annotations,
  selectedAnnotationId,
  selectionMode,
  onSelectAnnotation,
  onBoxSelect,
  cameraPosition,
  containerRef,
  setIsSelecting,
  setStartPoint,
  setEndPoint,
  isSelecting,
  startPoint,
  endPoint,
}) => {
  const { camera, scene } = useThree();

  const getPointFromEvent = useCallback((event: React.MouseEvent): THREE.Vector3 => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return new THREE.Vector3();

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      return intersects[0].point;
    }

    const direction = new THREE.Vector3();
    raycaster.ray.direction.normalize();
    return raycaster.ray.origin.clone().add(direction.multiplyScalar(10));
  }, [camera, scene, containerRef]);

  const handlePointerDown = useCallback((event: React.MouseEvent) => {
    if (selectionMode !== 'box-select') return;
    if (event.button !== 0) return;

    const point = getPointFromEvent(event);
    setStartPoint(point);
    setEndPoint(point);
    setIsSelecting(true);
  }, [selectionMode, getPointFromEvent, setStartPoint, setEndPoint, setIsSelecting]);

  const handlePointerMove = useCallback((event: React.MouseEvent) => {
    if (!isSelecting || !startPoint) return;

    const point = getPointFromEvent(event);
    setEndPoint(point);
  }, [isSelecting, startPoint, getPointFromEvent, setEndPoint]);

  const handlePointerUp = useCallback((event: React.MouseEvent) => {
    if (!isSelecting || !startPoint || !endPoint) return;

    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);
    const minZ = Math.min(startPoint.z, endPoint.z);
    const maxZ = Math.max(startPoint.z, endPoint.z);

    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    if (size > 0.1) {
      onBoxSelect({
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
      });
    }

    setIsSelecting(false);
    setStartPoint(null);
    setEndPoint(null);
  }, [isSelecting, startPoint, endPoint, onBoxSelect, setIsSelecting, setStartPoint, setEndPoint]);

  const filteredAnnotations = useMemo(() => {
    const { damageLevelFilter, treeRowFilter } = useAppStore.getState();

    return annotations.filter((a) => {
      if (damageLevelFilter.length > 0 && !damageLevelFilter.includes(a.damageLevel)) {
        return false;
      }
      if (treeRowFilter && a.treeRowId !== treeRowFilter) {
        return false;
      }
      return true;
    });
  }, [annotations]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDown = (e: MouseEvent) => handlePointerDown(e as unknown as React.MouseEvent);
    const handleMove = (e: MouseEvent) => handlePointerMove(e as unknown as React.MouseEvent);
    const handleUp = (e: MouseEvent) => handlePointerUp(e as unknown as React.MouseEvent);

    container.addEventListener('pointerdown', handleDown);
    container.addEventListener('pointermove', handleMove);
    container.addEventListener('pointerup', handleUp);
    container.addEventListener('pointerleave', handleUp);

    return () => {
      container.removeEventListener('pointerdown', handleDown);
      container.removeEventListener('pointermove', handleMove);
      container.removeEventListener('pointerup', handleUp);
      container.removeEventListener('pointerleave', handleUp);
    };
  }, [containerRef, handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <>
      <PerspectiveCamera makeDefault fov={60} near={0.1} far={10000} position={cameraPosition} />
      <CameraController position={cameraPosition} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enabled={selectionMode === 'view'}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 50, 25]} intensity={0.8} />

      {pointclouds.map((pc) => (
        <PointCloudMesh
          key={pc.id}
          pointcloud={pc}
          visible={pc.id === activePointcloudId || !activePointcloudId}
        />
      ))}

      {filteredAnnotations.map((annotation) => (
        <AnnotationBox
          key={annotation.id}
          annotation={annotation}
          isSelected={annotation.id === selectedAnnotationId}
          onClick={() => onSelectAnnotation(annotation.id)}
        />
      ))}

      <BoxSelectionOverlay
        isSelecting={isSelecting}
        startPoint={startPoint}
        endPoint={endPoint}
      />

      <gridHelper args={[100, 20, '#374151', '#1F2937']} position={[0, 0, 0]} />
      <axesHelper args={[5]} />
    </>
  );
};

interface PointCloudViewerProps {
  pointclouds: PointCloudData[];
  activePointcloudId: string | null;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  selectionMode: 'view' | 'box-select' | 'edit';
  onSelectAnnotation: (id: string | null) => void;
  onBoxSelect: (box: BoundingBox) => void;
  cameraPosition: [number, number, number];
}

const PointCloudViewer: React.FC<PointCloudViewerProps> = ({
  pointclouds,
  activePointcloudId,
  annotations,
  selectedAnnotationId,
  selectionMode,
  onSelectAnnotation,
  onBoxSelect,
  cameraPosition,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null);
  const [endPoint, setEndPoint] = useState<THREE.Vector3 | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = useCallback(() => {
    if (selectionMode === 'view') {
      onSelectAnnotation(null);
    }
  }, [selectionMode, onSelectAnnotation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      onClick={handleCanvasClick}
    >
      <Canvas
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0A0F1C' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0A0F1C');
        }}
      >
        <SceneContent
          pointclouds={pointclouds}
          activePointcloudId={activePointcloudId}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          selectionMode={selectionMode}
          onSelectAnnotation={onSelectAnnotation}
          onBoxSelect={onBoxSelect}
          cameraPosition={cameraPosition}
          containerRef={containerRef}
          setIsSelecting={setIsSelecting}
          setStartPoint={setStartPoint}
          setEndPoint={setEndPoint}
          isSelecting={isSelecting}
          startPoint={startPoint}
          endPoint={endPoint}
        />
      </Canvas>
    </div>
  );
};

export default PointCloudViewer;
