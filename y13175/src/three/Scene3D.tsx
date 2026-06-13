import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Sphere, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { SensorPoint } from '@/types';

function SensorPoints() {
  const selectedPointId = useAppStore((state) => state.selectedPointId);
  const setSelectedPointId = useAppStore((state) => state.setSelectedPointId);
  const currentTime = useAppStore((state) => state.currentTime);
  const selectedLogId = useAppStore((state) => state.selectedLogId);
  const sensorPoints = useAppStore((state) => state.sensorPoints);
  const getTimeSeries = useAppStore((state) => state.getTimeSeries);

  const points = useMemo(
    () => sensorPoints.filter((p) => p.logId === selectedLogId),
    [sensorPoints, selectedLogId]
  );

  const timeSeries = useMemo(
    () => getTimeSeries(selectedLogId || ''),
    [getTimeSeries, selectedLogId]
  );

  const intensityMap = useMemo(() => {
    if (timeSeries.length === 0) return {};
    const idx = Math.floor((currentTime - new Date(timeSeries[0].timestamp).getTime()) / 60000);
    const clampedIdx = Math.max(0, Math.min(timeSeries.length - 1, idx));
    return timeSeries[clampedIdx]?.values || {};
  }, [timeSeries, currentTime]);

  const getColor = (point: SensorPoint, intensity: number) => {
    if (point.type === 'laser') return '#ef4444';
    if (point.type === 'reference') return '#64748b';
    const t = intensity || 0.5;
    const r = Math.floor(255 * t);
    const g = Math.floor(180 * (1 - t));
    const b = Math.floor(100 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <>
      {points.map((point) => {
        const intensity = intensityMap[point.id] || 0.5;
        const isSelected = selectedPointId === point.id;
        const color = getColor(point, intensity);
        const scale = point.type === 'laser' ? 0.12 : point.type === 'reference' ? 0.08 : 0.1;

        return (
          <group key={point.id} position={[point.x, point.y, point.z]}>
            <Sphere
              args={[scale, 32, 32]}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPointId(isSelected ? null : point.id);
              }}
            >
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 1.5 : 0.6}
                transparent
                opacity={0.9}
              />
            </Sphere>
            {isSelected && (
              <>
                <Sphere args={[scale * 1.8, 32, 32]}>
                  <meshBasicMaterial
                    color="#0ea5e9"
                    transparent
                    opacity={0.2}
                  />
                </Sphere>
                <Line
                  points={[[point.x, point.y + 0.5, point.z], [point.x, point.y + scale + 0.05, point.z]]}
                  color="#0ea5e9"
                  lineWidth={2}
                />
              </>
            )}
          </group>
        );
      })}
    </>
  );
}

function SpecklePlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentTime = useAppStore((state) => state.currentTime);
  const selectedLogId = useAppStore((state) => state.selectedLogId);
  const sensorPoints = useAppStore((state) => state.sensorPoints);
  const getTimeSeries = useAppStore((state) => state.getTimeSeries);

  const points = useMemo(
    () => sensorPoints.filter((p) => p.logId === selectedLogId),
    [sensorPoints, selectedLogId]
  );

  const timeSeries = useMemo(
    () => getTimeSeries(selectedLogId || ''),
    [getTimeSeries, selectedLogId]
  );

  const intensity = useMemo(() => {
    if (timeSeries.length === 0) return 0.5;
    const startTime = new Date(timeSeries[0].timestamp).getTime();
    const idx = Math.floor((currentTime - startTime) / 60000);
    const clampedIdx = Math.max(0, Math.min(timeSeries.length - 1, idx));
    const values = Object.values(timeSeries[clampedIdx]?.values || {});
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0.5;
  }, [timeSeries, currentTime]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = state.clock.elapsedTime;
        material.uniforms.intensity.value = intensity;
      }
    }
  });

  const detectorCount = points.filter(p => p.type === 'detector').length;
  if (detectorCount === 0) return null;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 st = vUv * 30.0 + vec2(time * 0.5, time * 0.3);
      float n = noise(st);
      float speckle = smoothstep(0.4, 0.7, n);

      vec3 color1 = vec3(1.0, 0.4, 0.2);
      vec3 color2 = vec3(0.1, 0.05, 0.05);
      vec3 col = mix(color2, color1, speckle * intensity);

      float centerDist = length(vUv - 0.5);
      float falloff = smoothstep(0.7, 0.2, centerDist);
      col *= falloff;

      float alpha = speckle * intensity * falloff * 0.6;
      gl_FragColor = vec4(col, alpha);
    }
  `;

  return (
    <mesh ref={meshRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4, 4, 1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          time: { value: 0 },
          intensity: { value: 0.5 },
        }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial
        color="#0f172a"
        metalness={0.1}
        roughness={0.9}
      />
    </mesh>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#93c5fd" />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#f87171" />

      <GroundPlane />

      <Grid
        args={[12, 24]}
        position={[0, 0.005, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={20}
        fadeStrength={1}
        infiniteGrid={false}
      />

      <SpecklePlane />
      <SensorPoints />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
        />
      </EffectComposer>
    </>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [6, 5, 6], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0b1220' }}
    >
      <fog attach="fog" args={['#0b1220', 10, 25]} />
      <SceneContent />
    </Canvas>
  );
}
