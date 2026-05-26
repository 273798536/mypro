import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import type { RoomConfig, WallType } from '../../types';

interface AbsorberPanelsProps {
  room: RoomConfig;
}

export default function AbsorberPanels({ room }: AbsorberPanelsProps) {
  const panels = useStore((state) => state.absorberPanels);
  const materials = useStore((state) => state.materials);

  return (
    <group>
      {panels.map((panel) => {
        const material = materials.find((m) => m.id === panel.materialId);
        const position = getPanelPosition(panel.wall, panel.positionX, panel.positionY, room);
        const rotation = getPanelRotation(panel.wall);

        return (
          <mesh key={panel.id} position={position} rotation={rotation}>
            <boxGeometry args={[panel.width, panel.height, 0.08]} />
            <meshStandardMaterial
              color={material?.color || '#666666'}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
            />
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(panel.width, panel.height, 0.08)]} />
              <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
            </lineSegments>
          </mesh>
        );
      })}
    </group>
  );
}

function getPanelPosition(
  wall: WallType,
  posX: number,
  posY: number,
  room: RoomConfig
): [number, number, number] {
  const offset = 0.05;
  switch (wall) {
    case 'front':
      return [posX, posY, offset];
    case 'back':
      return [posX, posY, room.depth - offset];
    case 'left':
      return [offset, posY, posX];
    case 'right':
      return [room.width - offset, posY, posX];
    case 'floor':
      return [posX, offset, posY];
    case 'ceiling':
      return [posX, room.height - offset, posY];
    default:
      return [posX, posY, 0];
  }
}

function getPanelRotation(wall: WallType): [number, number, number] {
  switch (wall) {
    case 'left':
    case 'right':
      return [0, Math.PI / 2, 0];
    case 'floor':
      return [-Math.PI / 2, 0, 0];
    case 'ceiling':
      return [Math.PI / 2, 0, 0];
    default:
      return [0, 0, 0];
  }
}
