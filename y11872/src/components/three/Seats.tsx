import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Seat } from '@/types';
import { useTheaterStore } from '@/store/theaterStore';

interface SeatsProps {
  seats: Seat[];
}

export function Seats({ seats }: SeatsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const selectedSeat = useTheaterStore((state) => state.selectedSeat);
  const setSelectedSeat = useTheaterStore((state) => state.setSelectedSeat);
  const showComparison = useTheaterStore((state) => state.showComparison);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => new Float32Array(seats.length * 3), [seats.length]);

  const getSeatColor = (seat: Seat): THREE.Color => {
    if (showComparison && seat.comparisonStatus) {
      switch (seat.comparisonStatus) {
        case 'worsened':
          return new THREE.Color('#e74c3c');
        case 'improved':
          return new THREE.Color('#2ecc71');
        case 'new':
          return new THREE.Color('#3498db');
        default:
          break;
      }
    }

    if (seat.visibility) {
      const isBlocked =
        !seat.visibility.stage.visible ||
        !seat.visibility.leftScreen.visible ||
        !seat.visibility.rightScreen.visible;
      
      if (isBlocked) {
        return new THREE.Color('#e74c3c');
      }
      
      const isPartial =
        seat.visibility.stage.confidence === 'medium' ||
        seat.visibility.leftScreen.confidence === 'medium' ||
        seat.visibility.rightScreen.confidence === 'medium';
      
      if (isPartial) {
        return new THREE.Color('#f39c12');
      }
    }

    const sectionColors: Record<string, string> = {
      orchestra: '#d4af37',
      mezzanine: '#e94560',
      balcony: '#9b59b6',
    };
    return new THREE.Color(sectionColors[seat.section] || '#666');
  };

  seats.forEach((seat, i) => {
    const color = getSeatColor(seat);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  });

  useFrame(() => {
    if (!meshRef.current) return;

    seats.forEach((seat, i) => {
      dummy.position.set(seat.position.x, seat.position.y, seat.position.z);
      
      if (selectedSeat?.id === seat.id) {
        dummy.position.y += 0.15;
      }
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    const instanceId = event.instanceId;
    if (instanceId !== undefined && seats[instanceId]) {
      setSelectedSeat(seats[instanceId]);
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, seats.length]}
      onClick={handleClick}
    >
      <boxGeometry args={[0.6, 0.1, 0.6]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </boxGeometry>
      <meshStandardMaterial
        vertexColors
        emissive={new THREE.Color(0x000000)}
        emissiveIntensity={0.1}
        metalness={0.3}
        roughness={0.7}
      />
    </instancedMesh>
  );
}
