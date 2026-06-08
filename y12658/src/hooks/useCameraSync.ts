import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewStore } from '@/store/useViewStore';

interface Props {
  enabled?: boolean;
}

export function useCameraSync(enabled = true) {
  const { camera } = useThree();
  const setCamera = useViewStore((s) => s.setCamera);
  const targetPos = useViewStore((s) => s.cameraPosition);
  const targetLook = useViewStore((s) => s.cameraTarget);
  const autoRotate = useViewStore((s) => s.autoRotate);
  const target = useRef(new THREE.Vector3());
  const pending = useRef(true);
  const angle = useRef(0);

  useEffect(() => {
    target.current.set(targetLook.x, targetLook.y, targetLook.z);
    pending.current = true;
  }, [targetLook.x, targetLook.y, targetLook.z, targetPos.x, targetPos.y, targetPos.z]);

  useFrame((_, delta) => {
    if (!enabled) return;
    if (autoRotate) {
      angle.current += delta * 0.25;
      const r = 12;
      camera.position.x = Math.cos(angle.current) * r;
      camera.position.z = Math.sin(angle.current) * r;
      camera.position.y = 6;
      camera.lookAt(target.current);
      setCamera(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: target.current.x, y: target.current.y, z: target.current.z }
      );
      return;
    }
    if (pending.current) {
      const dest = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
      camera.position.lerp(dest, 0.12);
      const curLook = new THREE.Vector3();
      camera.getWorldDirection(curLook);
      curLook.add(camera.position);
      curLook.lerp(target.current, 0.12);
      camera.lookAt(curLook);
      const d = camera.position.distanceTo(dest) + curLook.distanceTo(target.current);
      if (d < 0.05) pending.current = false;
    }
  });
}
