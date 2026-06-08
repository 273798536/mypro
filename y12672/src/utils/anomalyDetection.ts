import type { ContainerPosition, AnomalyRecord, CameraState, Severity } from '../types';

const GRID_SIZE = 20;

interface SpaceGrid {
  [key: string]: ContainerPosition[];
}

function getGridKey(x: number, z: number): string {
  const gridX = Math.floor(x / GRID_SIZE);
  const gridZ = Math.floor(z / GRID_SIZE);
  return `${gridX},${gridZ}`;
}

function buildSpaceGrid(containers: ContainerPosition[]): SpaceGrid {
  const grid: SpaceGrid = {};
  containers.forEach((container) => {
    const key = getGridKey(container.x, container.z);
    if (!grid[key]) {
      grid[key] = [];
    }
    grid[key].push(container);
  });
  return grid;
}

function checkBoxOverlap(
  c1: ContainerPosition,
  c2: ContainerPosition
): { overlap: boolean; overlapVolume: number } {
  const xOverlap = Math.max(
    0,
    Math.min(c1.x + c1.width / 2, c2.x + c2.width / 2) -
      Math.max(c1.x - c1.width / 2, c2.x - c2.width / 2)
  );
  const yOverlap = Math.max(
    0,
    Math.min(c1.y + c1.height, c2.y + c2.height) - Math.max(c1.y, c2.y)
  );
  const zOverlap = Math.max(
    0,
    Math.min(c1.z + c1.depth / 2, c2.z + c2.depth / 2) -
      Math.max(c1.z - c1.depth / 2, c2.z - c2.depth / 2)
  );

  const overlapVolume = xOverlap * yOverlap * zOverlap;
  return { overlap: overlapVolume > 0, overlapVolume };
}

export function detectModelOverlaps(
  containers: ContainerPosition[],
  importBatch: string,
  sourceFile: string
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const grid = buildSpaceGrid(containers);

  const checkedPairs = new Set<string>();

  Object.values(grid).forEach((cellContainers) => {
    for (let i = 0; i < cellContainers.length; i++) {
      for (let j = i + 1; j < cellContainers.length; j++) {
        const c1 = cellContainers[i];
        const c2 = cellContainers[j];

        const pairKey = [c1.id, c2.id].sort().join('-');
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const { overlap, overlapVolume } = checkBoxOverlap(c1, c2);

        if (overlap) {
          const severity: Severity = overlapVolume > 50 ? 'high' : overlapVolume > 10 ? 'medium' : 'low';
          const overlapDesc =
            severity === 'high'
              ? `严重重叠，重叠体积约${overlapVolume.toFixed(1)}立方米`
              : severity === 'medium'
              ? `中等重叠，重叠体积约${overlapVolume.toFixed(1)}立方米`
              : `轻微重叠，重叠体积约${overlapVolume.toFixed(1)}立方米`;

          anomalies.push({
            id: `anomaly_overlap_${Date.now()}_${c1.id}_${c2.id}`,
            type: 'model_overlap',
            severity,
            status: 'pending',
            sourceInfo: {
              importBatch,
              importTime: new Date(),
              sourceFile,
            },
            riskNote: `发现${c1.name}和${c2.name}存在空间重叠，${overlapDesc}`,
            processingSuggestion: '',
            relatedContainerIds: [c1.id, c2.id],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  });

  return anomalies;
}

export function detectSizeExceeds(
  containers: ContainerPosition[],
  importBatch: string,
  sourceFile: string,
  maxWidth = 15,
  maxHeight = 12,
  maxDepth = 20
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];

  containers.forEach((container) => {
    const exceeds: string[] = [];
    let severity: Severity = 'low';

    if (container.width > maxWidth) {
      exceeds.push(`宽度${container.width}超出标准${maxWidth}`);
      if (container.width > maxWidth * 1.5) severity = 'high';
      else if (container.width > maxWidth * 1.2) severity = 'medium';
    }

    if (container.height > maxHeight) {
      exceeds.push(`高度${container.height}超出标准${maxHeight}`);
      if (container.height > maxHeight * 1.5) severity = 'high';
      else if (container.height > maxHeight * 1.2) severity = 'medium';
    }

    if (container.depth > maxDepth) {
      exceeds.push(`深度${container.depth}超出标准${maxDepth}`);
      if (container.depth > maxDepth * 1.5) severity = 'high';
      else if (container.depth > maxDepth * 1.2) severity = 'medium';
    }

    if (exceeds.length > 0) {
      anomalies.push({
        id: `anomaly_size_${Date.now()}_${container.id}`,
        type: 'size_exceed',
        severity,
        status: 'pending',
        sourceInfo: {
          importBatch,
          importTime: new Date(),
          sourceFile,
        },
        riskNote: `${container.name}尺寸异常：${exceeds.join('；')}`,
        processingSuggestion: '',
        relatedContainerIds: [container.id],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });

  return anomalies;
}

export function detectPositionOffsets(
  containers: ContainerPosition[],
  importBatch: string,
  sourceFile: string
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];

  containers.forEach((container) => {
    const expectedX = (container.z / 16) * 12 + 6;
    const expectedZ = (container.x / 12) * 16 + 8;

    const offsetX = Math.abs(container.x - expectedX);
    const offsetZ = Math.abs(container.z - expectedZ);

    if (offsetX > 3 || offsetZ > 3) {
      const severity: Severity =
        offsetX > 10 || offsetZ > 10 ? 'high' : offsetX > 5 || offsetZ > 5 ? 'medium' : 'low';

      anomalies.push({
        id: `anomaly_position_${Date.now()}_${container.id}`,
        type: 'position_offset',
        severity,
        status: 'pending',
        sourceInfo: {
          importBatch,
          importTime: new Date(),
          sourceFile,
        },
        riskNote: `${container.name}位置偏离预定坐标(X偏移${offsetX.toFixed(1)}米，Z偏移${offsetZ.toFixed(1)}米)`,
        processingSuggestion: '',
        relatedContainerIds: [container.id],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });

  return anomalies;
}

export function detectCameraLost(cameraState: CameraState): boolean {
  const { position, zoom } = cameraState;

  if (
    position.x === 0 &&
    position.y === 0 &&
    position.z === 0 &&
    zoom === 0
  ) {
    return true;
  }

  const maxRange = 1000;
  if (
    Math.abs(position.x) > maxRange ||
    Math.abs(position.y) > maxRange ||
    Math.abs(position.z) > maxRange
  ) {
    return true;
  }

  if (zoom <= 0 || zoom > 10) {
    return true;
  }

  return false;
}

export function createCameraLostAnomaly(
  cameraState: CameraState,
  importBatch: string,
  sourceFile: string
): AnomalyRecord {
  let lostReason = '未知原因';

  if (
    cameraState.position.x === 0 &&
    cameraState.position.y === 0 &&
    cameraState.position.z === 0 &&
    cameraState.zoom === 0
  ) {
    lostReason = '视角参数全为0';
  } else if (
    Math.abs(cameraState.position.x) > 1000 ||
    Math.abs(cameraState.position.y) > 1000 ||
    Math.abs(cameraState.position.z) > 1000
  ) {
    lostReason = '视角坐标超出有效范围';
  } else if (cameraState.zoom <= 0 || cameraState.zoom > 10) {
    lostReason = '缩放比例异常';
  }

  return {
    id: `anomaly_camera_${Date.now()}`,
    type: 'camera_lost',
    severity: 'high',
    status: 'pending',
    sourceInfo: {
      importBatch,
      importTime: new Date(),
      sourceFile,
    },
    riskNote: `三维视图相机视角异常，${lostReason}`,
    processingSuggestion: '',
    relatedContainerIds: [],
    cameraState: {
      ...cameraState,
      isLost: true,
      lostReason,
      savedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function runAllDetection(
  containers: ContainerPosition[],
  importBatch: string,
  sourceFile: string
): AnomalyRecord[] {
  const allAnomalies: AnomalyRecord[] = [];

  allAnomalies.push(...detectModelOverlaps(containers, importBatch, sourceFile));
  allAnomalies.push(...detectSizeExceeds(containers, importBatch, sourceFile));
  allAnomalies.push(...detectPositionOffsets(containers, importBatch, sourceFile));

  return allAnomalies;
}
