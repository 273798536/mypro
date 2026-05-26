import { useCallback, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { detectCoordinateOffset, checkOverlap } from '../utils/coordinateUtils';
import { UNSAVED_WARNING_INTERVAL } from '../utils/constants';
import { BoundingBox } from '../types';

export interface WarningItem {
  id: string;
  type: 'coordinate' | 'overlap' | 'unsaved' | 'import';
  level: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  details?: string;
}

export function useAnomalyDetection() {
  const {
    pointclouds,
    annotations,
    unsavedChanges,
    lastModifiedTime,
    coordinateOffsetWarning,
    levelOverlapWarning,
    setCoordinateOffsetWarning,
    setLevelOverlapWarning,
  } = useAppStore();

  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const addWarning = useCallback((warning: Omit<WarningItem, 'id' | 'timestamp'>) => {
    const newWarning: WarningItem = {
      ...warning,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    setWarnings((prev) => [...prev, newWarning]);
  }, []);

  const removeWarning = useCallback((id: string) => {
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  const checkCoordinateOffsets = useCallback(() => {
    setIsChecking(true);
    const foundWarnings: WarningItem[] = [];

    if (pointclouds.length < 2) {
      setCoordinateOffsetWarning(false);
      setIsChecking(false);
      return foundWarnings;
    }

    for (let i = 0; i < pointclouds.length; i++) {
      for (let j = i + 1; j < pointclouds.length; j++) {
        const result = detectCoordinateOffset(
          pointclouds[i].bounds,
          pointclouds[j].bounds
        );

        if (result.hasOffset) {
          foundWarnings.push({
            id: `${Date.now()}-${i}-${j}`,
            type: 'coordinate',
            level: 'warning',
            message: `点云坐标偏移：${pointclouds[i].name} 与 ${pointclouds[j].name} 偏移 ${result.offsetDistance.toFixed(2)}m`,
            timestamp: new Date(),
            details: `阈值: ${result.threshold}m`,
          });
        }
      }
    }

    setCoordinateOffsetWarning(foundWarnings.length > 0);
    setIsChecking(false);
    return foundWarnings;
  }, [pointclouds, setCoordinateOffsetWarning]);

  const checkLevelOverlaps = useCallback(() => {
    setIsChecking(true);
    const foundWarnings: WarningItem[] = [];

    if (annotations.length < 2) {
      setLevelOverlapWarning(false);
      setIsChecking(false);
      return foundWarnings;
    }

    for (let i = 0; i < annotations.length; i++) {
      for (let j = i + 1; j < annotations.length; j++) {
        const a = annotations[i];
        const b = annotations[j];

        const result = checkOverlap(a.box, b.box);

        if (result.hasOverlap && a.damageLevel !== b.damageLevel) {
          foundWarnings.push({
            id: `${Date.now()}-overlap-${i}-${j}`,
            type: 'overlap',
            level: 'warning',
            message: `等级覆盖：${a.treeRowId}(${a.damageLevel}) 与 ${b.treeRowId}(${b.damageLevel}) 重叠 ${(result.overlapPercentage * 100).toFixed(1)}%`,
            timestamp: new Date(),
            details: '不同损失等级的标注区域存在重叠',
          });
        }
      }
    }

    setLevelOverlapWarning(foundWarnings.length > 0);
    setIsChecking(false);
    return foundWarnings;
  }, [annotations, setLevelOverlapWarning]);

  const checkUnsavedChanges = useCallback(() => {
    if (!unsavedChanges || !lastModifiedTime) return;

    const now = new Date();
    const diff = now.getTime() - lastModifiedTime.getTime();

    if (diff > UNSAVED_WARNING_INTERVAL) {
      const existingWarning = warnings.find((w) => w.type === 'unsaved');
      if (!existingWarning) {
        addWarning({
          type: 'unsaved',
          level: 'warning',
          message: `存在未保存的更改，请及时保存版本`,
          details: `最后修改时间：${lastModifiedTime.toLocaleTimeString()}`,
        });
      }
    }
  }, [unsavedChanges, lastModifiedTime, addWarning, warnings]);

  const checkAll = useCallback(() => {
    const coordinateWarnings = checkCoordinateOffsets();
    const overlapWarnings = checkLevelOverlaps();

    setWarnings([...coordinateWarnings, ...overlapWarnings]);

    return {
      hasCoordinateWarnings: coordinateWarnings.length > 0,
      hasOverlapWarnings: overlapWarnings.length > 0,
      totalWarnings: coordinateWarnings.length + overlapWarnings.length,
    };
  }, [checkCoordinateOffsets, checkLevelOverlaps]);

  useEffect(() => {
    if (unsavedChanges) {
      checkUnsavedChanges();
    }
  }, [unsavedChanges, checkUnsavedChanges]);

  return {
    warnings,
    isChecking,
    coordinateOffsetWarning,
    levelOverlapWarning,
    unsavedChanges,
    addWarning,
    removeWarning,
    clearWarnings,
    checkCoordinateOffsets,
    checkLevelOverlaps,
    checkUnsavedChanges,
    checkAll,
  };
}
