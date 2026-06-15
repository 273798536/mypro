import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDataStore, useSceneStore, useProcessStore } from '@/stores';
import { latLonToXY, getRiskColor } from '@/utils/geo';
import type { BuoyData, ShipTrack, AnomalyPoint, AquacultureLog, SalinityData } from '@/types';

interface MarkerProps {
  centerLat: number;
  centerLon: number;
  scale?: number;
}

function BuoyMarker({ buoy, onClick }: { buoy: BuoyData; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
    }
    if (lightRef.current && buoy.isOffline) {
      lightRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
    }
  });

  const color = buoy.isOffline ? '#dc2626' : '#10b981';
  const emissive = buoy.isOffline ? '#7f1d1d' : '#065f46';

  return (
    <group
      position={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh ref={meshRef} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.25, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#92400e" emissiveIntensity={0.5} />
      </mesh>
      {buoy.isOffline && (
        <pointLight ref={lightRef} position={[0, 0.35, 0]} color="#dc2626" intensity={1} distance={1.5} />
      )}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function ShipMarker({
  ship,
  onClick,
}: {
  ship: { id: string; shipId: string; shipName: string; lat: number; lon: number; heading: number; speed: number };
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.05 + Math.sin(state.clock.elapsedTime * 1.5 + ship.lat) * 0.02;
    }
  });

  const headingRad = (ship.heading * Math.PI) / 180;

  return (
    <group
      ref={meshRef}
      rotation={[0, -headingRad, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.25]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.18, 0.02]}>
        <boxGeometry args={[0.05, 0.12, 0.1]} />
        <meshStandardMaterial color="#1e40af" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, -0.08]}>
        <coneGeometry args={[0.02, 0.15, 4]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function AnomalyMarker({ anomaly, onClick }: { anomaly: AnomalyPoint; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = getRiskColor(anomaly.riskLevel);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
    }
    if (ringRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      ringRef.current.scale.set(s, s, 1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 0.3, 0]} color={color} intensity={0.8} distance={1.2} />
    </group>
  );
}

function FarmMarker({ farm, onClick }: { farm: AquacultureLog; onClick: () => void }) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.18, 0.22, 6]} />
        <meshStandardMaterial color="#8b5cf6" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#a78bfa" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <tetrahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#4c1d95" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function StationMarker({ station, onClick }: { station: SalinityData; onClick: () => void }) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.12, 8]} />
        <meshStandardMaterial color="#14b8a6" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.15, 8]} />
        <meshStandardMaterial color="#0d9488" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#14b8a6" emissive="#134e4a" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function SceneMarkers({ centerLat, centerLon, scale = 80 }: MarkerProps) {
  const { buoys, shipTracks, aquacultureLogs, salinityDataList } = useDataStore();
  const { filters } = useSceneStore();
  const { getAllAnomalies } = useProcessStore();
  const { selectObject: selectSceneObject } = useSceneStore();

  const anomalies = getAllAnomalies();
  const filteredAnomalies = anomalies.filter((a) => filters.riskLevels.includes(a.riskLevel));

  const latestShips = useMemo(() => {
    const latest: Record<string, ShipTrack & { lat: number; lon: number }> = {};
    shipTracks.forEach((track) => {
      if (!latest[track.shipId] || new Date(track.timestamp) > new Date(latest[track.shipId].timestamp)) {
        latest[track.shipId] = { ...track, lat: track.latitude, lon: track.longitude };
      }
    });
    return Object.values(latest);
  }, [shipTracks]);

  const handleBuoyClick = (buoy: BuoyData) => {
    selectSceneObject({
      type: 'buoy',
      id: buoy.id,
      data: buoy as unknown as Record<string, unknown>,
    });
  };

  const handleShipClick = (ship: ShipTrack) => {
    selectSceneObject({
      type: 'ship',
      id: ship.shipId,
      data: ship as unknown as Record<string, unknown>,
    });
  };

  const handleAnomalyClick = (anomaly: AnomalyPoint) => {
    selectSceneObject({
      type: 'anomaly',
      id: anomaly.id,
      data: anomaly as unknown as Record<string, unknown>,
    });
  };

  const handleFarmClick = (farm: AquacultureLog) => {
    selectSceneObject({
      type: 'farm',
      id: farm.id,
      data: farm as unknown as Record<string, unknown>,
    });
  };

  const handleStationClick = (station: SalinityData) => {
    selectSceneObject({
      type: 'station',
      id: station.id,
      data: station as unknown as Record<string, unknown>,
    });
  };

  return (
    <group>
      {filters.showBuoys &&
        buoys.map((buoy) => {
          const { x, y } = latLonToXY(buoy.latitude, buoy.longitude, centerLat, centerLon, scale);
          return (
            <group key={buoy.id} position={[x, 0, -y]}>
              <BuoyMarker buoy={buoy} onClick={() => handleBuoyClick(buoy)} />
            </group>
          );
        })}

      {filters.showShips &&
        latestShips.map((ship) => {
          const { x, y } = latLonToXY(ship.latitude, ship.longitude, centerLat, centerLon, scale);
          return (
            <group key={ship.shipId} position={[x, 0, -y]}>
              <ShipMarker ship={ship as any} onClick={() => handleShipClick(ship)} />
            </group>
          );
        })}

      {filters.showAnomalies &&
        filteredAnomalies.map((anomaly) => {
          const { x, y } = latLonToXY(anomaly.latitude, anomaly.longitude, centerLat, centerLon, scale);
          return (
            <group key={anomaly.id} position={[x, 0, -y]}>
              <AnomalyMarker anomaly={anomaly} onClick={() => handleAnomalyClick(anomaly)} />
            </group>
          );
        })}

      {filters.showFarms &&
        aquacultureLogs.map((farm) => {
          const { x, y } = latLonToXY(farm.latitude, farm.longitude, centerLat, centerLon, scale);
          return (
            <group key={farm.id} position={[x, 0, -y]}>
              <FarmMarker farm={farm} onClick={() => handleFarmClick(farm)} />
            </group>
          );
        })}

      {filters.showStations &&
        salinityDataList.map((station) => {
          const { x, y } = latLonToXY(station.latitude, station.longitude, centerLat, centerLon, scale);
          return (
            <group key={station.id} position={[x, 0, -y]}>
              <StationMarker station={station} onClick={() => handleStationClick(station)} />
            </group>
          );
        })}
    </group>
  );
}
