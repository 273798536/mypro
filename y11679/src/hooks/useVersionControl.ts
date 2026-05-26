import { useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { UNSAVED_WARNING_INTERVAL } from '../utils/constants';
import { generateId } from '../utils/coordinateUtils';

export function useVersionControl() {
  const {
    versions,
    saveVersion,
    restoreVersion,
    unsavedChanges,
    lastModifiedTime,
    annotations,
    pointclouds,
    currentUser,
  } = useAppStore();

  const createVersion = useCallback(
    (description: string) => {
      saveVersion(description || `版本更新 ${new Date().toLocaleString()}`);
    },
    [saveVersion]
  );

  const revertToVersion = useCallback(
    (versionId: string) => {
      restoreVersion(versionId);
    },
    [restoreVersion]
  );

  const getVersionSummary = useCallback(
    (version: typeof versions[number]) => {
      const annotationCount = version.annotations.length;
      const pointcloudCount = version.pointclouds.length;
      const levelStats: Record<string, number> = {};

      for (const a of version.annotations) {
        levelStats[a.damageLevel] = (levelStats[a.damageLevel] || 0) + 1;
      }

      return {
        annotationCount,
        pointcloudCount,
        levelStats,
        timestamp: version.timestamp,
        author: version.author,
      };
    },
    []
  );

  const exportVersionHistory = useCallback(() => {
    return JSON.stringify(
      versions.map((v) => ({
        id: v.id,
        timestamp: v.timestamp.toISOString(),
        description: v.description,
        author: v.author,
        annotationCount: v.annotations.length,
      })),
      null,
      2
    );
  }, [versions]);

  useEffect(() => {
    if (!unsavedChanges || !lastModifiedTime) return;

    const checkUnsaved = () => {
      const now = new Date();
      const diff = now.getTime() - lastModifiedTime.getTime();

      if (diff > UNSAVED_WARNING_INTERVAL) {
        console.warn('[VersionControl] 存在未保存的更改，请及时保存版本');
      }
    };

    const interval = setInterval(checkUnsaved, 10000);
    return () => clearInterval(interval);
  }, [unsavedChanges, lastModifiedTime]);

  const createAutoSaveVersion = useCallback(() => {
    if (unsavedChanges) {
      createVersion(`自动保存 - ${new Date().toLocaleString()}`);
    }
  }, [unsavedChanges, createVersion]);

  return {
    versions,
    currentUser,
    createVersion,
    revertToVersion,
    getVersionSummary,
    exportVersionHistory,
    createAutoSaveVersion,
  };
}
