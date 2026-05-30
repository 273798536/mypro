import { useCallback } from 'react';
import { AttitudeData } from '../types';
import { useAttitudeStore } from '../store/useAttitudeStore';

export const useDataLoader = () => {
  const { setAttitudeData, resetToDefault } = useAttitudeStore();

  const loadData = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: AttitudeData = await response.json();
      setAttitudeData(data);
      return true;
    } catch (error) {
      console.error('Failed to load data:', error);
      return false;
    }
  }, [setAttitudeData]);

  const loadFromFileInput = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data: AttitudeData = JSON.parse(content);
          setAttitudeData(data);
          resolve(true);
        } catch (error) {
          console.error('Failed to parse file:', error);
          resolve(false);
        }
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        resolve(false);
      };
      reader.readAsText(file);
    });
  }, [setAttitudeData]);

  const loadSampleData = useCallback(async (sampleName: 'normal' | 'gimbal-lock' | 'dirty' | 'axis-reverse'): Promise<boolean> => {
    const filePathMap = {
      'normal': '/data/sample-normal.json',
      'gimbal-lock': '/data/sample-gimbal-lock.json',
      'dirty': '/data/sample-dirty.json',
      'axis-reverse': '/data/sample-axis-reverse.json',
    };
    return loadData(filePathMap[sampleName]);
  }, [loadData]);

  const reset = useCallback(() => {
    resetToDefault();
  }, [resetToDefault]);

  return {
    loadData,
    loadFromFileInput,
    loadSampleData,
    reset,
  };
};
