import { useCallback, useRef, createContext, useContext, useEffect } from 'react';
import type { OrbitControls } from 'three-stdlib';
import type { Viewpoint } from '@/types';

interface ViewpointContextType {
  controlsRef: React.RefObject<OrbitControls | null>;
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
  setControls: (controls: OrbitControls | null) => void;
  setCamera: (camera: THREE.PerspectiveCamera | null) => void;
}

const ViewpointContext = createContext<ViewpointContextType | null>(null);

let globalControls: OrbitControls | null = null;
let globalCamera: THREE.PerspectiveCamera | null = null;

export function ViewpointProvider({ children }: { children: React.ReactNode }) {
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const setControls = useCallback((controls: OrbitControls | null) => {
    controlsRef.current = controls;
    globalControls = controls;
  }, []);

  const setCamera = useCallback((camera: THREE.PerspectiveCamera | null) => {
    cameraRef.current = camera;
    globalCamera = camera;
  }, []);

  return (
    <ViewpointContext.Provider
      value={{ controlsRef, cameraRef, setControls, setCamera }}
    >
      {children}
    </ViewpointContext.Provider>
  );
}

export function useViewpoint() {
  const context = useContext(ViewpointContext);
  if (!context) {
    throw new Error('useViewpoint must be used within ViewpointProvider');
  }
  return context;
}

export function useCurrentViewpoint() {
  const getCurrentViewpoint = useCallback((): Promise<Viewpoint | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const controls = globalControls;
        const camera = globalCamera;
        
        if (!controls || !camera) {
          resolve(null);
          return;
        }

        resolve({
          id: '',
          name: '',
          cameraPosition: [
            Math.round(camera.position.x * 1000) / 1000,
            Math.round(camera.position.y * 1000) / 1000,
            Math.round(camera.position.z * 1000) / 1000,
          ],
          cameraTarget: [
            Math.round(controls.target.x * 1000) / 1000,
            Math.round(controls.target.y * 1000) / 1000,
            Math.round(controls.target.z * 1000) / 1000,
          ],
          createdAt: Date.now(),
        });
      }, 50);
    });
  }, []);

  return getCurrentViewpoint;
}

export function useApplyViewpoint() {
  const applyViewpoint = useCallback((viewpoint: Viewpoint) => {
    const controls = globalControls;
    const camera = globalCamera;
    
    if (!controls || !camera) return;

    camera.position.set(
      viewpoint.cameraPosition[0],
      viewpoint.cameraPosition[1],
      viewpoint.cameraPosition[2]
    );
    
    controls.target.set(
      viewpoint.cameraTarget[0],
      viewpoint.cameraTarget[1],
      viewpoint.cameraTarget[2]
    );
    
    controls.update();
  }, []);

  return applyViewpoint;
}
