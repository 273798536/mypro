import { useRef, useState, useEffect, ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { Group, Vector3, Plane } from 'three';
import { useAppStore } from '../../store/useAppStore';

interface DraggableProps {
  children: ReactNode;
  position: [number, number, number];
  onPositionChange: (position: [number, number, number]) => void;
}

export function Draggable({ children, position, onPositionChange }: DraggableProps) {
  const groupRef = useRef<Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl, raycaster } = useThree();
  const setDragging = useAppStore((state) => state.setDragging);
  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new Vector3());
  const dragPosition = useRef(new Vector3());

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
    }
  }, [position]);

  const onPointerDown = (event: any) => {
    event.stopPropagation();
    setIsDragging(true);
    setDragging(true);

    const intersectPoint = event.point.clone();
    const planeNormal = new Vector3(0, 1, 0);
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, intersectPoint);

    raycaster.setFromCamera(event.uv, camera);
    const intersection = new Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersection);
    dragOffset.current.copy(intersection).sub(groupRef.current!.position);

    gl.domElement.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: any) => {
    if (!isDragging) return;
    event.stopPropagation();

    raycaster.setFromCamera(event.uv, camera);
    const intersection = new Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersection);

    if (intersection) {
      const newPosition = intersection.sub(dragOffset.current);
      const clampedPosition: [number, number, number] = [
        Math.max(-10, Math.min(10, newPosition.x)),
        Math.max(0, Math.min(5, newPosition.y)),
        Math.max(-10, Math.min(10, newPosition.z)),
      ];

      if (groupRef.current) {
        groupRef.current.position.set(...clampedPosition);
      }
      dragPosition.current.set(...clampedPosition);
    }
  };

  const onPointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragging(false);
      onPositionChange([
        dragPosition.current.x,
        dragPosition.current.y,
        dragPosition.current.z,
      ]);
    }
    gl.domElement.style.cursor = 'grab';
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const rect = gl.domElement.getBoundingClientRect();
        const uv = {
          x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
          y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        };
        onPointerMove({ stopPropagation: () => {}, uv });
      }
    };

    const handlePointerUp = () => {
      onPointerUp();
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <group
      ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerOver={() => {
        if (!isDragging) {
          gl.domElement.style.cursor = 'grab';
        }
      }}
      onPointerOut={() => {
        if (!isDragging) {
          gl.domElement.style.cursor = 'default';
        }
      }}
    >
      {children}
    </group>
  );
}
