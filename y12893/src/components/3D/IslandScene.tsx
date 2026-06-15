import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useDataStore } from '@/store/useDataStore';
import { latLngToPosition, getLoadColor } from '@/utils/geoUtils';
import { STATUS_COLORS } from '@/types';
import type { DataRecord } from '@/types';

interface IslandSceneProps {
  onRecordClick: (record: DataRecord) => void;
}

function IslandModel() {
  const islandRef = useRef<THREE.Mesh>(null);
  const { sceneSettings } = useDataStore();

  const islandGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(80, 40, 64);
    geometry.translate(0, -10, 0);
    return geometry;
  }, []);

  const waterGeometry = useMemo(() => {
    return new THREE.CircleGeometry(500, 64);
  }, []);

  return (
    <>
      <group>
        <mesh ref={islandRef} geometry={islandGeometry} position={[0, 0, 0]}>
          <meshStandardMaterial
            color="#8B7355"
            wireframe={sceneSettings.showWireframe}
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>

        <mesh position={[0, 15, 0]}>
          <cylinderGeometry args={[50, 70, 15, 64]} />
          <meshStandardMaterial
            color="#228B22"
            wireframe={sceneSettings.showWireframe}
            roughness={0.9}
          />
        </mesh>

        <mesh position={[0, 25, 0]}>
          <cylinderGeometry args={[30, 45, 20, 64]} />
          <meshStandardMaterial
            color="#2E8B57"
            wireframe={sceneSettings.showWireframe}
            roughness={0.9}
          />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]} geometry={waterGeometry}>
        <meshStandardMaterial
          color="#1E90FF"
          transparent
          opacity={0.6}
          wireframe={sceneSettings.showWireframe}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    </>
  );
}

function PowerLines() {
  const { records, filters } = useDataStore();
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#FFD700', transparent: true, opacity: 0.6 }), []);

  const linePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const angles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];

    angles.forEach((angle, idx) => {
      const x = Math.cos(angle) * 100;
      const z = Math.sin(angle) * 100;

      points.push(new THREE.Vector3(0, 20, 0));
      points.push(new THREE.Vector3(x, 10, z));
      points.push(new THREE.Vector3(x, 15, z));

      const nearbyRecords = records.filter(r => {
        const pos = latLngToPosition(r.location.lat, r.location.lng);
        const dist = Math.sqrt(pos[0] ** 2 + pos[2] ** 2);
        return dist < 200;
      });

      nearbyRecords.forEach(record => {
        const recPos = latLngToPosition(record.location.lat, record.location.lng);
        points.push(new THREE.Vector3(x, 15, z));
        points.push(new THREE.Vector3(recPos[0], 5, recPos[2]));
      });
    });

    return points;
  }, [records]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    return geometry;
  }, [linePoints]);

  return <lineSegments geometry={lineGeometry} material={lineMaterial} />;
}

function DataPoints({ onClick }: { onClick: (record: DataRecord) => void }) {
  const { records, filters, selectedRecord, sceneSettings } = useDataStore();
  const hoveredId = useRef<string | null>(null);

  const filteredRecords = useMemo(() => {
    let filtered = records;
    if (filters.type?.length) {
      filtered = filtered.filter(r => filters.type!.includes(r.type));
    }
    if (filters.status?.length) {
      filtered = filtered.filter(r => filters.status!.includes(r.status));
    }
    if (filters.qualityIssues?.length) {
      filtered = filtered.filter(r => filters.qualityIssues!.some(q => r.qualityIssues.includes(q)));
    }
    return filtered;
  }, [records, filters]);

  const { scene } = useThree();

  useFrame((state) => {
    if (sceneSettings.autoRotate) {
      scene.rotation.y += 0.002;
    }
  });

  return (
    <group>
      {filteredRecords.map((record) => {
        const [x, y, z] = latLngToPosition(record.location.lat, record.location.lng);
        const hasIssues = record.qualityIssues.length > 0;
        const isSelected = selectedRecord?.id === record.id;
        const load = record.type === 'ship_track' ? record.powerConsumption :
                    record.type === 'aquaculture_log' ? record.dailyPowerUsage : record.relatedLoad;
        const color = hasIssues ? '#E63946' : getLoadColor(load);
        const size = hasIssues ? 4 : 2 + (load / 100);

        if (sceneSettings.clippingEnabled && y < sceneSettings.clippingPlaneY) {
          return null;
        }

        return (
          <group key={record.id}>
            <mesh
              position={[x, 5 + (record.location.depth || 0) / 10, z]}
              onClick={(e) => {
                e.stopPropagation();
                onClick(record);
              }}
              onPointerOver={() => {
                hoveredId.current = record.id;
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                hoveredId.current = null;
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[size, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.8 : hasIssues ? 0.3 : 0.1}
                transparent
                opacity={isSelected ? 1 : 0.8}
              />
            </mesh>

            {isSelected && (
              <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <mesh position={[x, 15 + (record.location.depth || 0) / 10, z]}>
                  <ringGeometry args={[size + 1, size + 2, 32]} />
                  <meshBasicMaterial color="#3E92CC" transparent opacity={0.8} />
                </mesh>
              </Float>
            )}

            {hasIssues && (
              <mesh position={[x, 10 + (record.location.depth || 0) / 10, z]}>
                <coneGeometry args={[1.5, 3, 4]} />
                <meshBasicMaterial color="#E63946" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function ClippingPlane() {
  const { sceneSettings } = useDataStore();

  if (!sceneSettings.clippingEnabled) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, sceneSettings.clippingPlaneY, 0]}>
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial
        color="#3E92CC"
        transparent
        opacity={0.1}
        side={THREE.DoubleSide}
      />
      <meshBasicMaterial
        color="#3E92CC"
        transparent
        opacity={0.5}
        wireframe
      />
    </mesh>
  );
}

function Lighting() {
  const { sceneSettings } = useDataStore();

  const sunAngle = (sceneSettings.timeOfDay - 6) * (Math.PI / 12);
  const sunX = Math.cos(sunAngle) * 500;
  const sunY = Math.sin(sunAngle) * 500;

  return (
    <>
      <hemisphereLight args={['#87CEEB', '#0A2463', 0.6]} />
      <directionalLight
        position={[sunX, sunY, 200]}
        intensity={1.2}
        castShadow
      >
        <orthographicCamera attach="shadow-camera" args={[-200, 200, 200, -200, 0.1, 1000]} />
      </directionalLight>
      <pointLight position={[0, 30, 0]} color="#FFD700" intensity={0.5} />
      <pointLight position={[-50, 20, 50]} color="#FFA500" intensity={0.3} />
      <pointLight position={[50, 20, -50]} color="#FFA500" intensity={0.3} />
    </>
  );
}

export function IslandScene({ onRecordClick }: IslandSceneProps) {
  const { sceneSettings } = useDataStore();

  return (
    <Canvas
      camera={{ position: [200, 150, 200], fov: 60, near: 0.1, far: 5000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(to bottom, #051439, #0A2463)' }}
    >
      <color attach="background" args={['#051439']} />
      <fog attach="fog" args={['#051439', 300, 800]} />

      <ambientLight intensity={0.4} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Lighting />

      <IslandModel />
      <PowerLines />
      <DataPoints onClick={onRecordClick} />
      <ClippingPlane />

      {sceneSettings.showGrid && (
        <Grid
          position={[0, -19, 0]}
          args={[1000, 1000]}
          cellSize={50}
          cellThickness={0.5}
          cellColor="#3E92CC"
          sectionSize={250}
          sectionThickness={1}
          sectionColor="#3E92CC"
          fadeDistance={500}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={100}
        maxDistance={800}
        maxPolarAngle={Math.PI / 2.1}
      />

      <EffectComposer>
        <DepthOfField focusDistance={0.02} focalLength={0.02} bokehScale={2} height={480} />
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </Canvas>
  );
}
