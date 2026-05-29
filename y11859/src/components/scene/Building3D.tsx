import React, { useMemo } from "react";
import { Box, Edges } from "@react-three/drei";
import type { Building, FloorNoise } from "@/types";

interface Building3DProps {
  building: Building;
  isSelected: boolean;
  selectedFloor: number | null;
  floorNoises: FloorNoise[];
  onClick: () => void;
}

function getNoiseColor(level: number): string {
  if (level >= 70) return "#ff2d2d";
  if (level >= 65) return "#ff6b35";
  if (level >= 55) return "#ffc107";
  if (level >= 40) return "#4caf50";
  return "#2196f3";
}

function Building3D({ building, isSelected, selectedFloor, floorNoises, onClick }: Building3DProps) {
  const { position, floors, floorHeight, width, depth } = building;

  const floorNoiseMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const fn of floorNoises) {
      map.set(fn.floor, fn.totalLevel);
    }
    return map;
  }, [floorNoises]);

  const totalHeight = floors * floorHeight;
  const baseY = position[1];

  return (
    <group position={[position[0], baseY + totalHeight / 2, position[2]]}>
      <Box args={[width, totalHeight, depth]} onClick={onClick}>
        <meshStandardMaterial color="#a0b4d0" transparent opacity={0.2} />
        <Edges color="#6b8db5" threshold={15} />
      </Box>

      {isSelected && (
        <Box args={[width + 0.1, totalHeight + 0.1, depth + 0.1]}>
          <meshBasicMaterial color="#ff6b35" wireframe transparent opacity={0.3} />
        </Box>
      )}

      {Array.from({ length: floors }, (_, i) => {
        const floorNum = i + 1;
        const floorY = -totalHeight / 2 + floorHeight * i + floorHeight / 2;
        const noiseLevel = floorNoiseMap.get(floorNum);
        const isFloorSelected = isSelected && selectedFloor === floorNum;

        let color = "white";
        let opacity = 0.05;

        if (noiseLevel !== undefined) {
          color = getNoiseColor(noiseLevel);
          opacity = isFloorSelected ? 0.9 : 0.4;
        } else if (isFloorSelected) {
          color = "#ff6b35";
          opacity = 0.8;
        }

        return (
          <Box
            key={floorNum}
            args={[width - 0.1, floorHeight - 0.05, depth - 0.1]}
            position={[0, floorY, 0]}
            onClick={onClick}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "auto";
            }}
          >
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </Box>
        );
      })}
    </group>
  );
}

export default React.memo(Building3D);
