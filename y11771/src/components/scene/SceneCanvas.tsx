import { useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import * as THREE from 'three'
import ArmModel from './ArmModel'
import WorkspaceCloud from './WorkspaceCloud'
import ObstacleMesh from './ObstacleMesh'
import SafetyZoneMesh from './SafetyZoneMesh'
import { useRobotStore } from '@/store/useRobotStore'
import { computeEndEffector } from '@/utils/kinematics'

function SceneContent() {
  const obstacles = useRobotStore(s => s.obstacles)
  const safetyZones = useRobotStore(s => s.safetyZones)
  const arm = useRobotStore(s => s.arm)

  return (
    <>
      <ambientLight intensity={0.3} color="#4466aa" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        color="#ffe8cc"
        castShadow={false}
      />
      <directionalLight
        position={[-3, 4, -5]}
        intensity={0.4}
        color="#aaccff"
      />

      <ArmModel />
      <WorkspaceCloud />

      {obstacles.map(obs => (
        <ObstacleMesh key={obs.id} obstacle={obs} />
      ))}
      {safetyZones.map(zone => (
        <SafetyZoneMesh key={zone.id} zone={zone} />
      ))}

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a2a3a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#1a3a5a"
        fadeDistance={15}
        fadeStrength={1}
        infiniteGrid
        position={[0, -0.01, 0]}
      />

      <OrbitControls
        makeDefault
        minDistance={2}
        maxDistance={20}
        target={[0, 1.5, 0]}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  )
}

export default function SceneCanvas() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [4, 4, 6], fov: 50, near: 0.1, far: 100 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        style={{ background: '#070b14' }}
      >
        <SceneContent />
      </Canvas>
    </div>
  )
}
