import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { use3DSceneSync } from '@/hooks/use3DSceneSync';
import { useAppStore } from '@/store/useAppStore';
import { depthToColor } from '@/utils/colorScale';
import type { MeasurePoint } from '@/types';

const CHANNEL_LEN = 10000;
const CHANNEL_W = 200;
const DEPTH_SCALE = 3;

function RiverbedTerrain({ clipping }: { clipping: ReturnType<typeof use3DSceneSync>['clipping'] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(CHANNEL_LEN + 200, CHANNEL_W + 80, 200, 40);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = (x + CHANNEL_LEN / 2) / CHANNEL_LEN;
      const v = (y + CHANNEL_W / 2) / CHANNEL_W;
      const dist = Math.abs(y);
      const base = 8 + 6 * Math.sin(u * Math.PI * 2.3) + 4 * Math.cos(u * Math.PI * 0.8)
        - Math.max(0, (dist / (CHANNEL_W / 2) - 0.6) * 12);
      const noise = Math.sin(x * 0.01) * 0.4 + Math.cos(y * 0.08) * 0.3;
      pos.setZ(i, -((base + noise) * DEPTH_SCALE));
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);

  const clippingPlanes = useMemo(() => {
    if (!clipping || !clipping.enabled) return [] as THREE.Plane[];
    const normal = clipping.orientation === 'x'
      ? new THREE.Vector3(1, 0, 0)
      : clipping.orientation === 'y'
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
    return [new THREE.Plane(normal, clipping.value)];
  }, [clipping]);

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: false,
    color: new THREE.Color('#1C3859'),
    metalness: 0.15,
    roughness: 0.85,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    clippingPlanes,
    clipShadows: true,
  }), [clippingPlanes]);

  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow />;
}

function SiltationLayer({ clipping }: { clipping: ReturnType<typeof use3DSceneSync>['clipping'] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(CHANNEL_LEN, CHANNEL_W * 0.8, 80, 20);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = (x + CHANNEL_LEN / 2) / CHANNEL_LEN;
      const silt = 0.5 + 1.8 * Math.sin(u * Math.PI * 1.5) ** 2 + 0.3 * Math.sin(y * 0.05);
      const base = 8 + 6 * Math.sin(u * Math.PI * 2.3) + 4 * Math.cos(u * Math.PI * 0.8);
      const totalDepth = base - silt;
      pos.setZ(i, -((totalDepth - 0.1) * DEPTH_SCALE));
      const [r, g, b] = depthToColor(totalDepth);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);

  const clippingPlanes = useMemo(() => {
    if (!clipping || !clipping.enabled) return [] as THREE.Plane[];
    const normal = clipping.orientation === 'x'
      ? new THREE.Vector3(1, 0, 0)
      : clipping.orientation === 'y'
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
    return [new THREE.Plane(normal, clipping.value)];
  }, [clipping]);

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    clippingPlanes,
  }), [clippingPlanes]);

  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} />;
}

function MeasurePointsMesh({
  points, selectedIds, selectedPointId, onClickPoint, clipping,
}: {
  points: MeasurePoint[];
  selectedIds: Set<string>;
  selectedPointId: string | null;
  onClickPoint: (id: string) => void;
  clipping: ReturnType<typeof use3DSceneSync>['clipping'];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.InstancedMesh>(null);
  const selectedPoint = points.find(p => p.pointId === selectedPointId);

  const clippingPlanes = useMemo(() => {
    if (!clipping || !clipping.enabled) return [] as THREE.Plane[];
    const normal = clipping.orientation === 'x'
      ? new THREE.Vector3(1, 0, 0)
      : clipping.orientation === 'y'
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
    return [new THREE.Plane(normal, clipping.value)];
  }, [clipping]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const selectedIdsArr = Array.from(selectedIds) as string[];
    points.forEach((p, i) => {
      if (selectedIds.size > 0) {
        const inLine = selectedIdsArr.some(sid => p.pointId.startsWith(sid));
        dummy.visible = inLine;
        if (!inLine) dummy.scale.set(0.001, 0.001, 0.001);
        else dummy.scale.setScalar(p.isAnomaly ? 1.4 : 1);
      } else {
        dummy.scale.setScalar(p.isAnomaly ? 1.4 : 1);
      }
      const [r, g, b] = p.correctedDepth < 0
        ? [0.95, 0.25, 0.25]
        : p.isAnomaly
          ? [0.96, 0.6, 0.05]
          : depthToColor(p.correctedDepth);
      dummy.position.set(
        p.mileage - CHANNEL_LEN / 2,
        p.offset,
        -Math.max(0.2, p.correctedDepth) * DEPTH_SCALE
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(r, g, b));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (highlightRef.current && selectedPoint) {
      dummy.scale.setScalar(2.5);
      dummy.position.set(
        selectedPoint.mileage - CHANNEL_LEN / 2,
        selectedPoint.offset,
        -Math.max(0.2, selectedPoint.correctedDepth) * DEPTH_SCALE
      );
      dummy.updateMatrix();
      highlightRef.current.setMatrixAt(0, dummy.matrix);
      highlightRef.current.instanceMatrix.needsUpdate = true;
      highlightRef.current.count = 1;
    } else if (highlightRef.current) {
      highlightRef.current.count = 0;
    }
  });

  const baseMat = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true,
    clippingPlanes,
  }), [clippingPlanes]);

  const hlMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    clippingPlanes,
  }), [clippingPlanes]);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, points.length]}
        material={baseMat}
        onPointerDown={(e) => {
          (e as any).stopPropagation?.();
          if (typeof e.instanceId === 'number' && points[e.instanceId]) {
            onClickPoint(points[e.instanceId].pointId);
          }
        }}
      >
        <sphereGeometry args={[1.8, 10, 10]} />
      </instancedMesh>
      <instancedMesh ref={highlightRef} args={[undefined, hlMat, 1]}>
        <ringGeometry args={[3.5, 5.0, 24]} />
      </instancedMesh>
    </group>
  );
}

function SectionLabels({ clipping }: { clipping: ReturnType<typeof use3DSceneSync>['clipping'] }) {
  const sections = useAppStore(s => s.report?.sections || []);
  const clippingEnabled = clipping?.enabled;
  return (
    <group>
      {sections.map(sec => {
        if (clippingEnabled && clipping?.orientation === 'x' && sec.mileage - CHANNEL_LEN / 2 > clipping!.value) return null;
        const x = sec.mileage - CHANNEL_LEN / 2;
        return (
          <group key={sec.sectionId} position={[x, CHANNEL_W / 2 + 18, -2]}>
            <mesh>
              <cylinderGeometry args={[0.4, 0.4, 10, 8]} />
              <meshStandardMaterial color="#2563EB" />
            </mesh>
            <Text
              position={[0, 8, 0]}
              fontSize={4}
              color="#60A5FA"
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, -Math.PI / 6]}
              outlineWidth={0.2}
              outlineColor="#0A2540"
            >
              {sec.sectionId}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const target = useAppStore(s => s.scene.cameraTarget);
  useFrame(() => {
    const tx = target[0] - CHANNEL_LEN / 2;
    camera.lookAt(tx, 0, -10 * DEPTH_SCALE);
  });
  return null;
}

export function ChannelScene() {
  const { allPoints, filteredPoints, selection, clipping, setSelectedPoint } = use3DSceneSync();
  const selectedIds = useMemo(() => new Set([
    ...selection.selectedSectionIds,
    ...selection.selectedLineIds,
  ]), [selection]);

  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false, localClippingEnabled: true }}
      camera={{ position: [0, 180, -120], fov: 50, near: 0.1, far: 5000 }}
      style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #0A2540 0%, #081929 60%, #050E1A 100%)' }}
    >
      <fog attach="fog" args={['#0A2540', 300, 1600]} />
      <ambientLight intensity={0.35} color="#87CEEB" />
      <hemisphereLight args={['#87CEEB', '#0A2540', 0.6]} />
      <directionalLight
        position={[600, 400, -300]}
        intensity={0.9}
        color="#FFE0B2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 50, -50]} intensity={0.3} color="#3B82F6" distance={500} />

      <Suspense fallback={null}>
        <RiverbedTerrain clipping={clipping} />
        <SiltationLayer clipping={clipping} />
        <MeasurePointsMesh
          points={allPoints}
          selectedIds={selectedIds}
          selectedPointId={selection.selectedPointId}
          onClickPoint={setSelectedPoint}
          clipping={clipping}
        />
        <SectionLabels clipping={clipping} />
        <gridHelper args={[CHANNEL_LEN + 400, 50, '#1E3A5F', '#172A45']} position={[0, 0, 0.01]} />
        <PerspectiveCamera makeDefault position={[0, 180, -120]} fov={50} />
        <CameraRig />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={20}
          maxDistance={1500}
          maxPolarAngle={Math.PI * 0.48}
          minPolarAngle={Math.PI * 0.08}
          target={[0, 0, -30]}
        />
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.9} intensity={0.45} mipmapBlur />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
