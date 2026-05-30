import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiverSection, CalculationResult, COLORS } from '../../types';
import { getElevationColor } from '../../utils/erosionEngine';

interface RiverbedMeshProps {
  sections: RiverSection[];
  result: CalculationResult | null;
  currentTime: number;
  selectedSectionId: string | null;
  onSectionClick: (sectionId: string) => void;
  compareResult?: CalculationResult | null;
  showDiff?: boolean;
}

export function RiverbedMesh({
  sections,
  result,
  currentTime,
  selectedSectionId,
  onSectionClick,
  compareResult,
  showDiff = false,
}: RiverbedMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  const { geometry, colors, maxAbsChange } = useMemo(() => {
    const sortedSections = [...sections].sort((a, b) => a.chainage - b.chainage);

    if (sortedSections.length < 2) {
      return { geometry: new THREE.BufferGeometry(), colors: new Float32Array(), maxAbsChange: 0 };
    }

    const positions: number[] = [];
    const colorValues: number[] = [];
    const indices: number[] = [];
    const sectionCoords: number[][] = [];

    let maxChange = 0;

    sortedSections.forEach((section) => {
      const elevations = result?.sectionElevations[section.id] || section.coordinates.map(c => c[2]);
      const compareElevations = compareResult?.sectionElevations[section.id];

      section.coordinates.forEach((coord, pointIdx) => {
        const elevation = elevations[pointIdx] ?? coord[2];
        let displayElevation = elevation;

        if (showDiff && compareElevations) {
          const compareElevation = compareElevations[pointIdx] ?? coord[2];
          const diff = elevation - compareElevation;
          displayElevation = coord[2] + diff * 5;
          maxChange = Math.max(maxChange, Math.abs(diff));
        } else {
          const bedChange = result?.bedChanges[section.id]?.[pointIdx] ?? 0;
          maxChange = Math.max(maxChange, Math.abs(bedChange));
        }

        positions.push(
          section.chainage * 0.1,
          coord[0] * 0.3,
          displayElevation * 0.5
        );
        sectionCoords.push([section.chainage, coord[0], displayElevation]);
      });
    });

    const pointsPerSection = sortedSections[0].coordinates.length;

    for (let s = 0; s < sortedSections.length - 1; s++) {
      for (let p = 0; p < pointsPerSection - 1; p++) {
        const i = s * pointsPerSection + p;
        indices.push(i, i + pointsPerSection, i + 1);
        indices.push(i + 1, i + pointsPerSection, i + pointsPerSection + 1);
      }
    }

    for (let s = 0; s < sortedSections.length; s++) {
      const section = sortedSections[s];
      const elevations = result?.sectionElevations[section.id] || section.coordinates.map(c => c[2]);
      const compareElevations = compareResult?.sectionElevations[section.id];

      section.coordinates.forEach((coord, pointIdx) => {
        let change = 0;

        if (showDiff && compareElevations) {
          const baseElev = compareElevations[pointIdx] ?? coord[2];
          const currentElev = elevations[pointIdx] ?? coord[2];
          change = currentElev - baseElev;
        } else {
          change = result?.bedChanges[section.id]?.[pointIdx] ?? 0;
        }

        const color = getElevationColor(change, maxChange || 0.1);
        const rgb = new THREE.Color(color);
        colorValues.push(rgb.r, rgb.g, rgb.b);
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorValues, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return {
      geometry,
      colors: new Float32Array(colorValues),
      maxAbsChange: maxChange,
    };
  }, [sections, result, compareResult, showDiff]);

  const wireframeGeometry = useMemo(() => {
    return new THREE.WireframeGeometry(geometry);
  }, [geometry]);

  useFrame(() => {
    if (meshRef.current?.geometry) {
      meshRef.current.geometry.attributes.position.needsUpdate = true;
      meshRef.current.geometry.attributes.color.needsUpdate = true;
    }
    if (wireframeRef.current?.geometry) {
      wireframeRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          const sortedSections = [...sections].sort((a, b) => a.chainage - b.chainage);
          const pointsPerSection = sortedSections[0]?.coordinates.length || 7;
          const faceIndex = e.face?.materialIndex ?? 0;
          const sectionIndex = Math.floor(faceIndex / (pointsPerSection * 2));
          if (sortedSections[sectionIndex]) {
            onSectionClick(sortedSections[sectionIndex].id);
          }
        }}
      >
        <meshPhongMaterial
          vertexColors
          side={THREE.DoubleSide}
          shininess={50}
          transparent
          opacity={0.95}
        />
      </mesh>

      <lineSegments ref={wireframeRef} geometry={wireframeGeometry}>
        <lineBasicMaterial color="#1E293B" transparent opacity={0.3} />
      </lineSegments>

      {sections.map((section) => {
        const isSelected = section.id === selectedSectionId;
        const chainage = section.chainage * 0.1;
        const minElev = Math.min(...section.coordinates.map(c => c[2])) * 0.5 - 1;

        return (
          <group key={section.id}>
            <mesh position={[chainage, 0, minElev]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[isSelected ? 1.5 : 1, isSelected ? 2 : 1.5, 16]} />
              <meshBasicMaterial
                color={isSelected ? COLORS.primary : '#64748B'}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
