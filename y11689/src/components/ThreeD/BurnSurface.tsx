import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Html, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BurnDataPoint, Risk } from '../../types';
import { useViewStore } from '../../store/useViewStore';
import { useRiskStore } from '../../store/useRiskStore';
import {
  generateSurfaceGeometry,
  generateLineGeometry,
  getRiskPositions,
  findNearestDataPoint,
  getMaxValue,
  SurfaceData
} from '../../utils/surfaceGenerator';

interface SurfaceMeshProps {
  dataPoints: BurnDataPoint[];
  type: 'budget' | 'spent' | 'revenue';
  maxValue: number;
  color: string;
  onPointClick: (point: BurnDataPoint) => void;
}

const SurfaceMesh = ({ dataPoints, type, maxValue, color, onPointClick }: SurfaceMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const data: SurfaceData = generateSurfaceGeometry(dataPoints, type, maxValue);
    
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geo.setIndex(data.indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [dataPoints, type, maxValue]);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = generateLineGeometry(dataPoints, type, maxValue);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [dataPoints, type, maxValue]);

  const handleClick = (event: any) => {
    event.stopPropagation();
    const point = event.point;
    const nearestPoint = findNearestDataPoint(point.x, dataPoints);
    if (nearestPoint) {
      onPointClick(nearestPoint);
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
      >
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={color} linewidth={3} />
      </lineSegments>
    </group>
  );
};

interface RiskMarkerProps {
  position: [number, number, number];
  risk: Risk;
  isSelected: boolean;
  onClick: () => void;
}

const RiskMarker = ({ position, risk, isSelected, onClick }: RiskMarkerProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (pulseRef.current) {
      const scale = 1 + Math.sin(time * 3) * 0.2;
      pulseRef.current.scale.setScalar(scale);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(time * 3) * 0.2;
    }
  });

  const getColor = () => {
    switch (risk.severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EF4444';
      case 'medium': return '#F97316';
      case 'low': return '#F59E0B';
    }
  };

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={getColor()}
            emissive={getColor()}
            emissiveIntensity={isSelected ? 2 : 1}
          />
        </mesh>
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial
            color={getColor()}
            transparent
            opacity={0.3}
          />
        </mesh>
      </Float>
      {isSelected && (
        <Html position={[0, 0.5, 0]} center>
          <div className="bg-red-900/90 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap backdrop-blur-sm border border-red-500/50">
            {risk.description.substring(0, 30)}...
          </div>
        </Html>
      )}
    </group>
  );
};

interface GroundGridProps {
  show: boolean;
}

const GroundGrid = ({ show }: GroundGridProps) => {
  if (!show) return null;

  return (
    <gridHelper
      args={[20, 20, '#1E3A5F', '#1E3A5F']}
      position={[0, -0.1, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
};

interface AxesProps {
  dataPoints: BurnDataPoint[];
  maxValue: number;
}

const Axes = ({ dataPoints, maxValue }: AxesProps) => {
  const showLabels = useViewStore((state) => state.showLabels);

  return (
    <group position={[-5, 0, -1.5]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 10, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#60A5FA" />
      </line>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 8, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#60A5FA" />
      </line>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 0, 3])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#60A5FA" />
      </line>

      {showLabels && (
        <>
          <Html position={[10.5, 0, 0]} center>
            <span className="text-xs text-blue-400 font-mono">时间</span>
          </Html>
          <Html position={[0, 8.5, 0]} center>
            <span className="text-xs text-blue-400 font-mono">金额 (百万)</span>
          </Html>
          <Html position={[0, 0, 3.5]} center>
            <span className="text-xs text-blue-400 font-mono">类型</span>
          </Html>

          {[0, 2, 4, 6, 8].map((y, i) => (
            <Html key={i} position={[-0.3, y, 0]} center>
              <span className="text-xs text-gray-400 font-mono">
                {(maxValue * y / 8 / 1000000).toFixed(1)}M
              </span>
            </Html>
          ))}

          {dataPoints.length > 0 && (
            <>
              <Html position={[0, -0.5, 0]} center>
                <span className="text-xs text-gray-400 font-mono">
                  {dataPoints[0].date.substring(5)}
                </span>
              </Html>
              <Html position={[10, -0.5, 0]} center>
                <span className="text-xs text-gray-400 font-mono">
                  {dataPoints[dataPoints.length - 1].date.substring(5)}
                </span>
              </Html>
            </>
          )}
        </>
      )}
    </group>
  );
};

interface TimeSlicePlaneProps {
  position: number;
  dataPoints: BurnDataPoint[];
  maxValue: number;
}

const TimeSlicePlane = ({ position, dataPoints, maxValue }: TimeSlicePlaneProps) => {
  const xPos = -5 + position * 10;

  return (
    <group position={[xPos, 4, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[8, 3]} />
        <meshBasicMaterial
          color="#60A5FA"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, -4, -1.5, 0, -4, 1.5])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#60A5FA" />
      </line>
    </group>
  );
};

interface CameraControllerProps {
  position: [number, number, number];
}

const CameraController = ({ position }: CameraControllerProps) => {
  const { camera } = useThree();
  const setCameraPosition = useViewStore((state) => state.setCameraPosition);

  useEffect(() => {
    camera.position.set(...position);
  }, [camera, position]);

  useFrame(() => {
    setCameraPosition([camera.position.x, camera.position.y, camera.position.z]);
  });

  return null;
};

interface BurnSurfaceProps {
  dataPoints: BurnDataPoint[];
  risks: Risk[];
}

export const BurnSurface = ({ dataPoints, risks }: BurnSurfaceProps) => {
  const maxValue = useMemo(() => getMaxValue(dataPoints), [dataPoints]);
  const timeSlice = useViewStore((state) => state.timeSlice);
  const showGrid = useViewStore((state) => state.showGrid);
  const cameraPosition = useViewStore((state) => state.cameraPosition);
  const selectedDataPoint = useViewStore((state) => state.selectedDataPoint);
  const setSelectedDataPoint = useViewStore((state) => state.setSelectedDataPoint);
  const selectedRiskId = useRiskStore((state) => state.selectedRiskId);
  const selectRisk = useRiskStore((state) => state.selectRisk);

  const riskPositions = useMemo(() => {
    return getRiskPositions(risks.filter(r => !r.resolved), dataPoints, maxValue);
  }, [risks, dataPoints, maxValue]);

  const handlePointClick = (point: BurnDataPoint) => {
    setSelectedDataPoint(point);
    selectRisk(null);
  };

  const handleRiskClick = (risk: Risk) => {
    selectRisk(risk.id === selectedRiskId ? null : risk.id);
  };

  if (dataPoints.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-400 text-lg">加载数据中...</div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <CameraController position={cameraPosition} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#93C5FD" />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#FCD34D" />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#60A5FA" />

      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />

      <SurfaceMesh
        dataPoints={dataPoints}
        type="budget"
        maxValue={maxValue}
        color="#3B82F6"
        onPointClick={handlePointClick}
      />
      <SurfaceMesh
        dataPoints={dataPoints}
        type="spent"
        maxValue={maxValue}
        color="#F59E0B"
        onPointClick={handlePointClick}
      />
      <SurfaceMesh
        dataPoints={dataPoints}
        type="revenue"
        maxValue={maxValue}
        color="#10B981"
        onPointClick={handlePointClick}
      />

      {riskPositions.map((pos, index) => (
        <RiskMarker
          key={pos.risk.id}
          position={[pos.x, pos.y, pos.z]}
          risk={pos.risk}
          isSelected={pos.risk.id === selectedRiskId}
          onClick={() => handleRiskClick(pos.risk)}
        />
      ))}

      <TimeSlicePlane position={timeSlice} dataPoints={dataPoints} maxValue={maxValue} />
      <GroundGrid show={showGrid} />
      <Axes dataPoints={dataPoints} maxValue={maxValue} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
};
