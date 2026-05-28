import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { toOhms, toFarads, toVolts } from '@/utils/units';
import Resistor from './Resistor';
import Capacitor from './Capacitor';
import Battery from './Battery';
import CurrentParticles from './CurrentParticles';
import VoltageLabels from './VoltageLabels';

function CircuitScene() {
  const { params, result, simulationTime, isSimulating, setSimulationTime } = useStore();
  const groupRef = useRef<THREE.Group>(null);

  const R = toOhms(params.resistance, params.resistanceUnit);
  const C = toFarads(params.capacitance, params.capacitanceUnit);
  const Vs = toVolts(params.sourceVoltage, params.voltageUnit);
  const tau = R * C;

  const normalizedTime = useMemo(() => {
    if (tau === 0) return 0;
    return (simulationTime % (tau * 5)) / tau;
  }, [simulationTime, tau]);

  const capacitorVoltage = useMemo(() => {
    if (params.mode === 'discharge') {
      return Vs * Math.exp(-normalizedTime);
    }
    return Vs * (1 - Math.exp(-normalizedTime)) + toVolts(params.initialVoltage, params.voltageUnit) * Math.exp(-normalizedTime);
  }, [normalizedTime, Vs, params.mode, params.initialVoltage, params.voltageUnit]);

  const current = useMemo(() => {
    if (R === 0 || tau === 0) return 0;
    if (params.mode === 'discharge') {
      return (capacitorVoltage / R) * Math.exp(-normalizedTime);
    }
    return ((Vs - capacitorVoltage) / R);
  }, [capacitorVoltage, R, tau, normalizedTime, Vs, params.mode]);

  useFrame((_, delta) => {
    if (isSimulating && result?.status !== 'error') {
      setSimulationTime(simulationTime + delta);
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(simulationTime * 0.1) * 0.05;
    }
  });

  const circuitPositions = useMemo(() => ({
    battery: { pos: [-6, 0, 0] as [number, number, number], rot: [0, 0, Math.PI / 2] as [number, number, number] },
    resistor: { pos: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
    capacitor: { pos: [6, 0, 0] as [number, number, number], rot: [0, 0, Math.PI / 2] as [number, number, number] },
    switch: { pos: [3, 2, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
  }), []);

  const currentIntensity = Math.min(Math.abs(current) * 100, 1);

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight
        position={[-6, 2, 0]}
        color="#00D4FF"
        intensity={0.5 + currentIntensity * 0.5}
      />
      <pointLight
        position={[6, 2, 0]}
        color={capacitorVoltage > Vs * 0.5 ? '#FF3366' : '#00D4FF'}
        intensity={0.3 + (capacitorVoltage / Vs) * 0.7}
      />

      <Grid
        args={[30, 30]}
        position={[0, -2, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#00D4FF"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />

      <mesh position={[0, -1.99, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0A0E17" transparent opacity={0.8} />
      </mesh>

      <group position={[0, 1, 0]}>
        <Battery
          position={circuitPositions.battery.pos}
          rotation={circuitPositions.battery.rot}
          voltage={Vs}
          current={current}
        />

        <Resistor
          position={circuitPositions.resistor.pos}
          rotation={circuitPositions.resistor.rot}
          resistance={R}
          current={current}
        />

        <Capacitor
          position={circuitPositions.capacitor.pos}
          rotation={circuitPositions.capacitor.rot}
          capacitance={C}
          voltage={capacitorVoltage}
          maxVoltage={Vs}
          current={current}
        />

        <mesh position={[-3, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 6, 8]} />
          <meshStandardMaterial
            color={current > 0.001 ? '#00D4FF' : '#333'}
            emissive={current > 0.001 ? '#00D4FF' : '#000'}
            emissiveIntensity={currentIntensity * 0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[3, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 6, 8]} />
          <meshStandardMaterial
            color={current > 0.001 ? '#00D4FF' : '#333'}
            emissive={current > 0.001 ? '#00D4FF' : '#000'}
            emissiveIntensity={currentIntensity * 0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[-4.5, 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
          <meshStandardMaterial
            color={current > 0.001 ? '#00D4FF' : '#333'}
            emissive={current > 0.001 ? '#00D4FF' : '#000'}
            emissiveIntensity={currentIntensity * 0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[4.5, 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
          <meshStandardMaterial
            color={current > 0.001 ? '#00D4FF' : '#333'}
            emissive={current > 0.001 ? '#00D4FF' : '#000'}
            emissiveIntensity={currentIntensity * 0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[0, 3.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 9, 8]} />
          <meshStandardMaterial
            color={current > 0.001 ? '#00D4FF' : '#333'}
            emissive={current > 0.001 ? '#00D4FF' : '#000'}
            emissiveIntensity={currentIntensity * 0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <CurrentParticles
          startPoint={new THREE.Vector3(-6, 0, 0)}
          endPoint={new THREE.Vector3(6, 0, 0)}
          current={current}
          color="#00D4FF"
          count={50}
        />

        <VoltageLabels
          batteryPos={circuitPositions.battery.pos}
          resistorPos={circuitPositions.resistor.pos}
          capacitorPos={circuitPositions.capacitor.pos}
          Vs={Vs}
          Vr={current * R}
          Vc={capacitorVoltage}
          tau={tau}
        />
      </group>

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </group>
  );
}

export default function View3D() {
  const { isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0A0E17]">
        <div className="text-cyan-400 font-mono text-lg animate-pulse">
          初始化3D场景...
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 8, 12], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(to bottom, #0A0E17 0%, #1a1a2e 100%)' }}
    >
      <color attach="background" args={['#0A0E17']} />
      <fog attach="fog" args={['#0A0E17', 20, 40]} />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      
      <CircuitScene />
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 + 0.2}
      />
    </Canvas>
  );
}
