import { useRef } from 'react';
import * as THREE from 'three';
import type { Slot } from '@/@types';

interface YardGroundProps {
  slots: Slot[];
  yardWidth: number;
  yardDepth: number;
  selectedSlotId: string | null;
  modifiedSlotId: string | null;
  lockedSlotIds: string[];
  onSlotClick: (slotId: string) => void;
}

export function YardGround({
  slots,
  yardWidth,
  yardDepth,
  selectedSlotId,
  modifiedSlotId,
  lockedSlotIds,
  onSlotClick,
}: YardGroundProps) {
  const groupRef = useRef<THREE.Group>(null);

  const width = yardWidth * 2.2 + 2;
  const depth = yardDepth * 1.2 + 2;

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2 - 1, -0.01, depth / 2 - 1]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      <gridHelper
        args={[Math.max(width, depth), Math.max(yardWidth, yardDepth) * 2, '#2a2a4e', '#1e1e3e']}
        position={[width / 2 - 1, 0.01, depth / 2 - 1]}
      />
      
      {slots.filter(s => s.tier === 0).map((slot) => {
        const x = slot.bay * 2.2;
        const z = slot.row * 1.2;
        const isSelected = selectedSlotId === slot.id;
        const isModified = modifiedSlotId === slot.id;
        const isLocked = lockedSlotIds.includes(slot.id);
        
        let color = '#252545';
        if (isSelected) color = '#457B9D';
        else if (isModified) color = '#FFD700';
        else if (isLocked) color = '#4a3728';
        else if (slot.status === 'occupied') color = '#2d4a3e';
        
        return (
          <mesh
            key={slot.id}
            position={[x + 1, 0.02, z + 0.5]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSlotClick(slot.id);
            }}
          >
            <planeGeometry args={[2, 1]} />
            <meshStandardMaterial
              color={color}
              emissive={isSelected ? color : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
      
      {Array.from({ length: yardDepth }).map((_, rowIndex) => (
        <sprite key={`row-label-${rowIndex}`} position={[-0.5, 0.5, rowIndex * 1.2 + 0.5]}>
          <spriteMaterial>
            <canvasTexture
              image={(function createLabelCanvas() {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'rgba(10, 36, 99, 0.9)';
                  ctx.fillRect(0, 0, 64, 32);
                  ctx.fillStyle = '#F1FAEE';
                  ctx.font = 'bold 16px monospace';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(String.fromCharCode(65 + rowIndex), 32, 16);
                }
                return canvas;
              })()}
            />
          </spriteMaterial>
        </sprite>
      ))}
      
      {Array.from({ length: yardWidth }).map((_, bayIndex) => (
        <sprite key={`bay-label-${bayIndex}`} position={[bayIndex * 2.2 + 1, 0.5, -0.5]}>
          <spriteMaterial>
            <canvasTexture
              image={(function createLabelCanvas() {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'rgba(10, 36, 99, 0.9)';
                  ctx.fillRect(0, 0, 64, 32);
                  ctx.fillStyle = '#F1FAEE';
                  ctx.font = 'bold 14px monospace';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(String(bayIndex + 1).padStart(2, '0'), 32, 16);
                }
                return canvas;
              })()}
            />
          </spriteMaterial>
        </sprite>
      ))}
    </group>
  );
}
