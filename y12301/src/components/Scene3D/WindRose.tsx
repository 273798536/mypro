import { useMemo } from 'react';
import * as THREE from 'three';
import { WindDirection } from '../../types';

interface WindRoseProps {
  windData: WindDirection[];
  position: [number, number, number];
  radius: number;
}

export function WindRose({ windData, position, radius }: WindRoseProps) {
  const { spokeLines, petalMeshes, ringLines, directionLabels } = useMemo(() => {
    const spokes: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const petals: { points: [number, number, number][]; color: string; opacity: number }[] = [];
    const rings: { radius: number; opacity: number }[] = [];
    const labels: { position: [number, number, number]; text: string }[] = [];

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const directionAngles = [0, 45, 90, 135, 180, 225, 270, 315];

    for (let i = 0; i < 8; i++) {
      const angle = (directionAngles[i] * Math.PI) / 180;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      spokes.push({
        start: [0, 0, 0],
        end: [x, 0, z],
      });
      labels.push({
        position: [Math.sin(angle) * (radius + 5), 0, Math.cos(angle) * (radius + 5)],
        text: directions[i],
      });
    }

    for (const wind of windData) {
      const angle = (wind.angle * Math.PI) / 180;
      const petalLength = radius * wind.frequency * 2;
      const petalWidth = (Math.PI / 16) * (0.5 + wind.speed * 0.1);

      const points: [number, number, number][] = [];
      const segments = 12;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const sideAngle = (t - 0.5) * petalWidth * 2;
        const dist = petalLength * Math.cos(sideAngle);
        const px = Math.sin(angle + sideAngle) * dist;
        const pz = Math.cos(angle + sideAngle) * dist;
        points.push([px, 0, pz]);
      }
      points.push([0, 0, 0]);

      const intensity = Math.min(1, wind.speed / 5);
      petals.push({
        points,
        color: `hsl(${170 + intensity * 30}, 90%, ${50 + intensity * 20}%)`,
        opacity: 0.4 + wind.frequency * 0.4,
      });
    }

    [0.25, 0.5, 0.75, 1.0].forEach((scale) => {
      rings.push({ radius: radius * scale, opacity: 0.15 + scale * 0.1 });
    });

    return {
      spokeLines: spokes,
      petalMeshes: petals,
      ringLines: rings,
      directionLabels: labels,
    };
  }, [windData, radius]);

  return (
    <group position={position}>
      {ringLines.map((ring, i) => (
        <mesh key={`ring-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[ring.radius - 0.15, ring.radius, 64]} />
          <meshBasicMaterial
            color="#00D4AA"
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {spokeLines.map((spoke, i) => {
        const points = [
          new THREE.Vector3(...spoke.start),
          new THREE.Vector3(...spoke.end),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineObj = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#00D4AA', transparent: true, opacity: 0.4 }));
        return <primitive key={`spoke-${i}`} object={lineObj} />;
      })}

      {petalMeshes.map((petal, i) => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        for (let j = 0; j < petal.points.length - 1; j++) {
          shape.lineTo(petal.points[j][0], petal.points[j][2]);
        }
        shape.closePath();

        return (
          <mesh
            key={`petal-${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.05, 0]}
          >
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial
              color={petal.color}
              transparent
              opacity={petal.opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {directionLabels.map((label, i) => {
        const sprite = new THREE.CanvasTexture((() => {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 32;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#00D4AA';
          ctx.font = 'bold 24px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label.text, 32, 16);
          return canvas;
        })());

        return (
          <sprite
            key={`label-${i}`}
            position={label.position}
            scale={[6, 3, 1]}
          >
            <spriteMaterial map={sprite} transparent opacity={0.8} />
          </sprite>
        );
      })}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#00D4AA" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
