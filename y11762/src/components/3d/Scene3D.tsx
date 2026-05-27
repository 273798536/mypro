import Bar3D from './Bar3D';
import StarField from './StarField';
import { useStore } from '../../store/useStore';
import { Grid, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export default function Scene3D() {
  const { regions, anomalies, activeMetric, selectedRegion, hoveredRegion, filterRegions, setSelectedRegion, setHoveredRegion } = useStore();

  const filteredRegions = regions.filter(r =>
    filterRegions.length === 0 || filterRegions.includes(r.region)
  );

  const maxVal = Math.max(...filteredRegions.map(r => r[activeMetric]), 1);

  return (
    <>
      <ambientLight intensity={0.3} color="#B0BEC5" />
      <directionalLight position={[10, 20, 10]} intensity={0.8} color="#E0E0E0" castShadow />
      <pointLight position={[0, 15, 0]} intensity={0.5} color="#4FC3F7" distance={50} />

      <StarField />

      <Grid
        position={[0, -0.01, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a3a5c"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a5a8c"
        fadeDistance={40}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {filteredRegions.map(region => {
        const anomaly = anomalies.find(a => a.region === region.region);
        return (
          <Bar3D
            key={region.id}
            region={region}
            anomaly={anomaly}
            activeMetric={activeMetric}
            isSelected={selectedRegion === region.region}
            isHovered={hoveredRegion === region.region}
            onSelect={setSelectedRegion}
            onHover={setHoveredRegion}
            maxVal={maxVal}
          />
        );
      })}

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={50}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.1}
        target={[0, 2, 0]}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          intensity={0.6}
        />
      </EffectComposer>
    </>
  );
}
