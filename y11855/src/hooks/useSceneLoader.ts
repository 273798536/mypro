import { useCallback } from 'react';
import type { SceneData } from '../types';
import { useAppStore } from '../store/useAppStore';
import sampleSuccess from '../data/sample-success.json';
import sampleError from '../data/sample-error.json';

export function useSceneLoader() {
  const loadScene = useAppStore(state => state.loadScene);
  const setShowValidationModal = useAppStore(state => state.setShowValidationModal);

  const loadSampleSuccess = useCallback(() => {
    loadScene(sampleSuccess as SceneData);
  }, [loadScene]);

  const loadSampleError = useCallback(() => {
    loadScene(sampleError as SceneData);
  }, [loadScene]);

  const loadFromFile = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          loadScene(data as SceneData);
          resolve();
        } catch (error) {
          reject(new Error('JSON解析失败，请检查文件格式'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsText(file);
    });
  }, [loadScene]);

  const exportScene = useCallback((scene: SceneData): string => {
    return JSON.stringify(scene, null, 2);
  }, []);

  const downloadScene = useCallback((scene: SceneData, filename?: string) => {
    const content = exportScene(scene);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${scene.name || 'scene'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportScene]);

  return {
    loadSampleSuccess,
    loadSampleError,
    loadFromFile,
    exportScene,
    downloadScene,
    setShowValidationModal
  };
}
