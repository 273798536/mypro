import { useCallback } from 'react';
import type { ScreenshotItem, DataRecord } from '../types';
import { timestampName } from '../utils/exportUtils';
import { useReviewStore } from '../store/reviewStore';
import { useSceneStore } from '../store/sceneStore';

export function useScreenshot(glRef: React.RefObject<{ domElement: HTMLCanvasElement } | null>) {
  const addScreenshot = useReviewStore((s) => s.addScreenshot);
  const currentTimeParam = useReviewStore((s) => s.currentTimeParam);
  const viewpoints = useSceneStore((s) => s.viewpoints);
  const camera = useSceneStore((s) => s.camera);

  const capture = useCallback(
    (record?: DataRecord, viewpointName?: string): ScreenshotItem | null => {
      const gl = glRef.current;
      if (!gl) return null;
      const canvas = gl.domElement;
      if (!canvas) return null;

      const dataUrl = canvas.toDataURL('image/png');
      const name = timestampName('vent');
      const currentVp = viewpoints.find(
        (v) =>
          Math.abs(v.camera.position.x - camera.position.x) < 1 &&
          Math.abs(v.camera.position.y - camera.position.y) < 1
      );

      const item: ScreenshotItem = {
        id: `ss-${Date.now()}`,
        name,
        viewpointId: currentVp?.id,
        viewpointName: viewpointName || currentVp?.name || '自定义视角',
        recordId: record?.id,
        timeParam: currentTimeParam,
        metadata: record
          ? {
              coordinateSystem: record.coordinateSystem,
              x: record.x,
              y: record.y,
              z_m: record.z_m,
              sourceFile: record.sourceFile,
              sourceLine: record.sourceLine,
              version: record.version,
              temperature: record.temperature,
              flowRate: record.flowRate,
            }
          : {
              coordinateSystem: 'WGS84',
              x: 0,
              y: 0,
              z_m: 0,
              sourceFile: 'scene-capture',
              sourceLine: 0,
              version: 'V1',
              temperature: 0,
              flowRate: 0,
            },
        dataUrl,
        createdAt: new Date().toISOString(),
      };
      addScreenshot(item);
      return item;
    },
    [addScreenshot, currentTimeParam, viewpoints, camera, glRef]
  );

  return { capture };
}
