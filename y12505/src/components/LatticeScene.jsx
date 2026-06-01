import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useLatticeStore } from '../store/latticeStore'
import { LatticeNode } from './LatticeNode'
import { DefectMarker } from './DefectMarker'
import { AnomalyMarker } from './AnomalyMarker'

const Axes = ({ size = 6 }) => {
  const { scene } = useThree()
  useEffect(() => {
    const axesHelper = new THREE.AxesHelper(size)
    scene.add(axesHelper)
    return () => scene.remove(axesHelper)
  }, [scene, size])
  return null
}

const SceneContent = () => {
  const nodes = useLatticeStore(state => state.nodes)
  const defects = useLatticeStore(state => state.defects)
  const anomalies = useLatticeStore(state => state.anomalies)
  const viewMode = useLatticeStore(state => state.viewMode)
  const setSelectedObject = useLatticeStore(state => state.setSelectedObject)

  const showStress = viewMode === 'stress'

  const handleBackgroundClick = () => {
    setSelectedObject(null)
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <Axes size={6} />

      <group onClick={handleBackgroundClick}>
        {nodes.map(node => (
          <LatticeNode key={node.id} node={node} showStress={showStress} />
        ))}

        {defects.map(defect => (
          <DefectMarker key={defect.id} defect={defect} />
        ))}

        {anomalies.map((anomaly, index) => (
          <AnomalyMarker key={`anomaly-${index}`} anomaly={anomaly} />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={30}
      />
    </>
  )
}

export const LatticeScene = () => {
  return (
    <Canvas
      camera={{ position: [8, 8, 8], fov: 50 }}
      style={{ background: '#1a1a2e' }}
    >
      <SceneContent />
    </Canvas>
  )
}
