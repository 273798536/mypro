import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { StandardComplaint } from '@/shared/types';
import { useBusinessStore } from '@/stores/useBusinessStore';
import CityBlocks from './CityBlocks';
import ParkMesh from './ParkMesh';
import ComplaintMarker from './ComplaintMarker';

function filterComplaints(
  complaints: StandardComplaint[],
  filters: ReturnType<typeof useBusinessStore.getState>['filters']
): StandardComplaint[] {
  return complaints.filter((c) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) return false;
    if (filters.sources.length > 0 && !filters.sources.includes(c.source)) return false;
    if (filters.intersections.length > 0 && !filters.intersections.includes(c.intersection)) return false;
    if (filters.hasCoordIssue !== null) {
      const hasIssue = !!c.coordIssue;
      if (hasIssue !== filters.hasCoordIssue) return false;
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const match =
        c.intersection.toLowerCase().includes(kw) ||
        c.content.toLowerCase().includes(kw);
      if (!match) return false;
    }
    if (filters.dateRange) {
      const occurred = new Date(c.occurredAt).getTime();
      if (filters.dateRange.start) {
        const start = new Date(filters.dateRange.start).getTime();
        if (occurred < start) return false;
      }
      if (filters.dateRange.end) {
        const end = new Date(filters.dateRange.end).getTime();
        if (occurred > end) return false;
      }
    }
    return true;
  });
}

function SceneContent() {
  const isStarted = useBusinessStore((s) => s.isStarted);
  const complaints = useBusinessStore((s) => s.complaints);
  const parks = useBusinessStore((s) => s.parks);
  const filters = useBusinessStore((s) => s.filters);
  const focusedComplaintId = useBusinessStore((s) => s.focusedComplaintId);

  const filteredComplaints = useMemo(
    () => filterComplaints(complaints, filters),
    [complaints, filters]
  );

  if (!isStarted) {
    return (
      <Text
        position={[0, 20, 0]}
        fontSize={4}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        点击右上角『启动』加载数据
      </Text>
    );
  }

  return (
    <>
      <CityBlocks />
      {parks.map((park) => (
        <ParkMesh key={park.id} park={park} />
      ))}
      {filteredComplaints.map((complaint) => (
        <ComplaintMarker
          key={complaint.id}
          complaint={complaint}
          isFocused={complaint.id === focusedComplaintId}
        />
      ))}
    </>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [150, 180, 150], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 200, 500]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[100, 150, 100]}
        intensity={1.0}
        color="#e0f2fe"
        castShadow
      />
      <hemisphereLight args={['#1e3a8a', '#0f172a', 0.6]} />

      <Grid
        args={[400, 400]}
        position={[0, 0, 0]}
        cellSize={20}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={100}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={300}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan={false}
        minDistance={50}
        maxDistance={300}
        target={[0, 0, 0]}
        makeDefault
      />

      <SceneContent />

      <EffectComposer>
        <Bloom
          mipmapBlur
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
        <Vignette eskil={false} offset={0.3} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
