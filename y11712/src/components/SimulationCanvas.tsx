import { useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../store/simulationStore';
import { tempToColor } from '../utils/colorMap';

function PlateMesh() {
  const { temperatureField, currentTimeStep, grid, params, resultStats, selectPoint } = useSimulationStore();
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);

  const { minTemp, maxTemp } = resultStats || { minTemp: 0, maxTemp: 100 };

  const { positions, colors } = useMemo(() => {
    if (temperatureField.length === 0) {
      const positions: [number, number, number][] = [];
      const colors: [number, number, number][] = [];
      for (let j = 0; j < grid.ny; j++) {
        for (let i = 0; i < grid.nx; i++) {
          const halfLen = params.plateLength / 2;
          const halfWid = params.plateWidth / 2;
          const x = (i / (grid.nx - 1)) * params.plateLength - halfLen;
          const y = (j / (grid.ny - 1)) * params.plateWidth - halfWid;
          positions.push([x, 0, y]);
          colors.push([0.3, 0.3, 0.35]);
        }
      }
      return { positions, colors };
    }

    const slice = temperatureField[currentTimeStep] || [];
    const positions: [number, number, number][] = [];
    const colors: [number, number, number][] = [];

    const halfLen = params.plateLength / 2;
    const halfWid = params.plateWidth / 2;

    for (let j = 0; j < grid.ny; j++) {
      for (let i = 0; i < grid.nx; i++) {
        const x = (i / (grid.nx - 1)) * params.plateLength - halfLen;
        const y = (j / (grid.ny - 1)) * params.plateWidth - halfWid;
        positions.push([x, 0, y]);

        const temp = slice[j]?.[i] ?? params.initialTemp;
        colors.push(tempToColor(temp, minTemp, maxTemp));
      }
    }

    return { positions, colors };
  }, [temperatureField, currentTimeStep, grid, params, minTemp, maxTemp]);

  const indices = useMemo(() => {
    const idx: number[] = [];
    for (let j = 0; j < grid.ny - 1; j++) {
      for (let i = 0; i < grid.nx - 1; i++) {
        const a = j * grid.nx + i;
        const b = a + 1;
        const c = a + grid.nx + 1;
        const d = a + grid.nx;
        idx.push(a, b, d, b, c, d);
      }
    }
    return idx;
  }, [grid.nx, grid.ny]);

  useEffect(() => {
    if (!geometryRef.current) return;
    const geo = geometryRef.current;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions.flat(), 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors.flat(), 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
  }, [positions, colors, indices]);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const point = event.point;
    const halfLen = params.plateLength / 2;
    const halfWid = params.plateWidth / 2;
    const i = Math.round(((point.x + halfLen) / params.plateLength) * (grid.nx - 1));
    const j = Math.round(((point.z + halfWid) / params.plateWidth) * (grid.ny - 1));
    if (i >= 0 && i < grid.nx && j >= 0 && j < grid.ny) {
      selectPoint(i, j);
    }
  }, [params, grid, selectPoint]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
      <planeGeometry ref={geometryRef} />
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

function SelectedPointMarker() {
  const { selectedPoint, grid, params, temperatureField, currentTimeStep, resultStats } = useSimulationStore();
  const { minTemp, maxTemp } = resultStats || { minTemp: 0, maxTemp: 100 };

  if (!selectedPoint || temperatureField.length === 0) return null;

  const halfLen = params.plateLength / 2;
  const halfWid = params.plateWidth / 2;
  const x = (selectedPoint.i / (grid.nx - 1)) * params.plateLength - halfLen;
  const z = (selectedPoint.j / (grid.ny - 1)) * params.plateWidth - halfWid;

  const slice = temperatureField[currentTimeStep];
  const temp = slice?.[selectedPoint.j]?.[selectedPoint.i] ?? 0;
  const [r, g, b] = tempToColor(temp, minTemp, maxTemp);

  return (
    <mesh position={[x, 0.002, z]}>
      <sphereGeometry args={[0.003, 16, 16]} />
      <meshBasicMaterial color={new THREE.Color(1 - r, 1 - g, 1 - b)} />
    </mesh>
  );
}

function Scene() {
  const { camera } = useThree();
  const { params } = useSimulationStore();

  useEffect(() => {
    camera.position.set(params.plateLength * 0.8, params.plateLength * 0.8, params.plateLength * 0.8);
    camera.lookAt(0, 0, 0);
  }, [camera, params.plateLength]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      <PlateMesh />
      <SelectedPointMarker />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[params.plateLength * 1.3, params.plateWidth * 1.3]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={0.05}
        maxDistance={3}
      />
    </>
  );
}

export default function SimulationCanvas() {
  return (
    <Canvas
      camera={{ position: [0.15, 0.15, 0.15], fov: 50 }}
      style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a2332 100%)' }}
      gl={{ antialias: true }}
    >
      <Scene />
    </Canvas>
  );
}
