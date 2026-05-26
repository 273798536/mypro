import { useState, useCallback } from 'react';
import { PointCloudData, Point } from '../types';
import { parsePointCloudFile, createPointCloudData, generateSamplePointCloud } from '../utils/pointcloudParser';
import { useAppStore } from '../store/useAppStore';

export function usePointCloud() {
  const { pointclouds, activePointcloudId, importPointcloud, setActivePointcloud } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState(0);

  const activePointcloud = pointclouds.find((pc) => pc.id === activePointcloudId);

  const loadSampleData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const points = generateSamplePointCloud(100000, 8, 15);
      const pointcloud = createPointCloudData('果园示例数据', '示例数据生成器', points);
      importPointcloud(pointcloud, { mode: 'append' });
      setIsLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成示例数据失败');
      setIsLoading(false);
    }
  }, [importPointcloud]);

  const loadFromFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setParseProgress(0);

      const result = await parsePointCloudFile(file, file.name, '文件导入');

      if (!result.success || !result.points) {
        setError(result.error || '解析文件失败');
        setIsLoading(false);
        return;
      }

      setParseProgress(50);

      const pointcloud = createPointCloudData(
        file.name.replace(/\.[^/.]+$/, ''),
        `文件: ${file.name}`,
        result.points
      );

      setParseProgress(80);

      importPointcloud(pointcloud, { mode: 'append' });

      setParseProgress(100);
      setIsLoading(false);
    },
    [importPointcloud]
  );

  const loadFromFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsLoading(true);
      setError(null);

      const fileArray = files instanceof FileList ? Array.from(files) : files;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setParseProgress(Math.round((i / fileArray.length) * 50));

        const result = await parsePointCloudFile(file, file.name, '文件导入');

        if (!result.success || !result.points) {
          setError(`文件 ${file.name}: ${result.error || '解析失败'}`);
          continue;
        }

        const pointcloud = createPointCloudData(
          file.name.replace(/\.[^/.]+$/, ''),
          `文件: ${file.name}`,
          result.points
        );

        importPointcloud(pointcloud, { mode: 'append' });
        setParseProgress(Math.round(((i + 1) / fileArray.length) * 100));
      }

      setIsLoading(false);
    },
    [importPointcloud]
  );

  const removePointcloud = useCallback(
    (id: string) => {
      const currentPointclouds = pointclouds.filter((pc) => pc.id !== id);
      useAppStore.setState({
        pointclouds: currentPointclouds,
        activePointcloudId: activePointcloudId === id ? currentPointclouds[0]?.id || null : activePointcloudId,
      });
    },
    [pointclouds, activePointcloudId]
  );

  const getPointCloudStats = useCallback(
    (pointcloud: PointCloudData) => {
      if (!pointcloud || pointcloud.points.length === 0) {
        return {
          totalPoints: 0,
          avgIntensity: 0,
          colorDistribution: { r: 0, g: 0, b: 0 },
        };
      }

      let totalIntensity = 0;
      let rSum = 0, gSum = 0, bSum = 0;

      for (const point of pointcloud.points) {
        totalIntensity += point.intensity || 0;
        rSum += point.r;
        gSum += point.g;
        bSum += point.b;
      }

      const count = pointcloud.points.length;

      return {
        totalPoints: count,
        avgIntensity: totalIntensity / count,
        colorDistribution: {
          r: rSum / count,
          g: gSum / count,
          b: bSum / count,
        },
      };
    },
    []
  );

  return {
    pointclouds,
    activePointcloud,
    activePointcloudId,
    isLoading,
    error,
    parseProgress,
    setActivePointcloud,
    loadSampleData,
    loadFromFile,
    loadFromFiles,
    removePointcloud,
    getPointCloudStats,
  };
}
