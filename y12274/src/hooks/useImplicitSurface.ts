import { useMemo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ImplicitFunction, Point3D } from '../utils/implicitParser';
import { marchingCubes, MarchingCubesResult } from '../utils/marchingCubes';

interface UseImplicitSurfaceOptions {
  expression: string;
  parameters: Record<string, number>;
  bounds: { min: Point3D; max: Point3D };
  resolution?: number;
  colorMode?: 'curvature' | 'height' | 'normal' | 'gradient';
  colormap?: string;
}

export function useImplicitSurface({
  expression,
  parameters,
  bounds,
  resolution = 48,
  colorMode = 'normal',
  colormap = 'viridis',
}: UseImplicitSurfaceOptions) {
  const implicitFunc = useMemo(() => new ImplicitFunction(), []);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const resultRef = useRef<MarchingCubesResult | null>(null);

  useEffect(() => {
    const compileResult = implicitFunc.compile(expression);
    setIsValid(compileResult);
    setError(implicitFunc.getError());

    if (!compileResult) {
      setGeometry(null);
      return;
    }

    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      try {
        const result = marchingCubes(
          implicitFunc,
          parameters,
          bounds,
          resolution,
          colorMode,
          colormap
        );
        resultRef.current = result;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(result.vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(result.normals, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(result.colors, 3));
        geo.setIndex(new THREE.BufferAttribute(result.indices, 1));
        geo.computeBoundingSphere();

        setGeometry(geo);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate surface');
        setGeometry(null);
      } finally {
        setIsLoading(false);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [expression, parameters, bounds, resolution, colorMode, colormap, implicitFunc]);

  return {
    geometry,
    isValid,
    error,
    isLoading,
    implicitFunc,
  };
}
